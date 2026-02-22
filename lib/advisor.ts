/**
 * Advisor orchestrator — routes to LLM or heuristic fallback.
 * Caches by input hash. Validates all AI output with Zod.
 */
import crypto from 'crypto';
import type { ScenarioInput, ForecastResult, UserPreferences } from './types';
import { AdvisorResponseSchema, type AdvisorResponse } from './advisor-schema';
import { runHeuristicAdvisor } from './heuristic-advisor';

// ── Input summarizer ──────────────────────────────────────────────────────────

export interface AdvisorSummary {
  currency: string;
  months: number;
  totalMonthlyIncome: number;
  totalMonthlyFixedExpenses: number;
  totalMonthlyDiscretionary: number;
  totalDebtBalance: number;
  totalDebtAnnualInterest: number;
  totalInvestmentValue: number;
  totalMonthlyContribution: number;
  forecast: {
    endNetWorth: number;
    endCash: number;
    minCash: number;
    minCashMonth: number;
    negativeCashMonths: number[];
    debtFreeMonth: number | null;
    totalInterestPaid: number;
    endInvestmentValue: number;
  };
  preferences: {
    riskProfile: string;
    emergencyFundMonths: number;
    advisorTone: string;
  };
}

export function buildSummary(
  scenario: ScenarioInput,
  forecast: ForecastResult,
  prefs: Partial<UserPreferences> = {}
): AdvisorSummary {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    currency: scenario.currency,
    months: scenario.months,
    totalMonthlyIncome: r2(scenario.incomes.reduce((s, i) => s + i.amount, 0)),
    totalMonthlyFixedExpenses: r2(
      scenario.expenses.filter((e) => e.category === 'fixed' || e.category === 'rent').reduce((s, e) => s + e.amount, 0)
    ),
    totalMonthlyDiscretionary: r2(
      scenario.expenses.filter((e) => e.category === 'discretionary').reduce((s, e) => s + e.amount, 0)
    ),
    totalDebtBalance: r2(scenario.debts.reduce((s, d) => s + d.balance, 0)),
    totalDebtAnnualInterest: r2(scenario.debts.reduce((s, d) => s + d.balance * (d.annualRate / 100), 0)),
    totalInvestmentValue: r2(scenario.investments.reduce((s, i) => s + i.currentValue, 0)),
    totalMonthlyContribution: r2(scenario.investments.reduce((s, i) => s + i.monthlyContribution, 0)),
    forecast: forecast.summary,
    preferences: {
      riskProfile: prefs.riskProfile ?? 'med',
      emergencyFundMonths: prefs.emergencyFundMonths ?? 3,
      advisorTone: prefs.advisorTone ?? 'concise',
    },
  };
}

export function hashSummary(summary: AdvisorSummary): string {
  return crypto.createHash('sha256').update(JSON.stringify(summary)).digest('hex').slice(0, 16);
}

// ── Prompt builder ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a financial planning assistant. Provide informational insights based ONLY on the numbers provided. Output strict JSON matching the schema. No external facts, no stock picks, no market predictions. All amounts in the user's base currency.`;

function buildUserPrompt(s: AdvisorSummary): string {
  return `Scenario (${s.months} months, currency: ${s.currency}):
- Monthly income: ${s.totalMonthlyIncome}
- Fixed expenses: ${s.totalMonthlyFixedExpenses}, Discretionary: ${s.totalMonthlyDiscretionary}
- Total debt: ${s.totalDebtBalance}, Annual interest: ${s.totalDebtAnnualInterest}
- Investment value: ${s.totalInvestmentValue}, Monthly contribution: ${s.totalMonthlyContribution}
- Risk profile: ${s.preferences.riskProfile}, Emergency fund target: ${s.preferences.emergencyFundMonths} months
Forecast summary:
- End net worth: ${s.forecast.endNetWorth}, End cash: ${s.forecast.endCash}
- Min cash: ${s.forecast.minCash} (month ${s.forecast.minCashMonth})
- Negative cash months: ${s.forecast.negativeCashMonths.length > 0 ? s.forecast.negativeCashMonths.slice(0, 5).join(',') : 'none'}
- Debt-free month: ${s.forecast.debtFreeMonth ?? 'not reached'}
- Total interest paid: ${s.forecast.totalInterestPaid}
- End investment value: ${s.forecast.endInvestmentValue}

Return ONLY this JSON structure (no markdown, no extra keys):
{
  "insights": [{"title":"","why":"","impact_aed":0,"confidence":"low|med|high"}],
  "alerts": [{"type":"cash|debt|rent|fx|portfolio","message":"","monthIndex":0}],
  "actions": [{"id":"","label":"","changes":{},"expectedOutcome":{"netWorthDelta":0,"minCashDelta":0}}]
}
Max 6 insights, all amounts as numbers. Tone: ${s.preferences.advisorTone}.
DISCLAIMER REMINDER: Output is informational only. Do not claim to predict markets.`;
}

// ── LLM callers ───────────────────────────────────────────────────────────────

async function callOpenAI(summary: AdvisorSummary): Promise<string> {
  const { OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.chat.completions.create({
    model: process.env.AI_MODEL ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(summary) },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  });
  return res.choices[0].message.content ?? '{}';
}

async function callAnthropic(summary: AdvisorSummary): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: process.env.AI_MODEL ?? 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(summary) }],
  });
  const block = res.content[0];
  return block.type === 'text' ? block.text : '{}';
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export interface AdvisorRunResult {
  response: AdvisorResponse;
  model: string;
  inputHash: string;
  fromCache: boolean;
}

// In-memory cache (per server process). DB-level cache handled in API route.
const memCache = new Map<string, AdvisorResponse>();

export async function runAdvisor(
  scenario: ScenarioInput,
  forecast: ForecastResult,
  prefs: Partial<UserPreferences> = {}
): Promise<AdvisorRunResult> {
  const summary = buildSummary(scenario, forecast, prefs);
  const inputHash = hashSummary(summary);
  const provider = process.env.AI_PROVIDER ?? 'mock';
  const model = provider === 'mock' ? 'heuristic-v1' : (process.env.AI_MODEL ?? provider);

  // Check memory cache
  if (memCache.has(inputHash)) {
    return { response: memCache.get(inputHash)!, model, inputHash, fromCache: true };
  }

  // Mock / heuristic path
  if (provider === 'mock' || (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY)) {
    const response = runHeuristicAdvisor(scenario, forecast, prefs.emergencyFundMonths ?? 3);
    memCache.set(inputHash, response);
    return { response, model: 'heuristic-v1', inputHash, fromCache: false };
  }

  // LLM path
  let raw: string;
  try {
    if (provider === 'anthropic') {
      raw = await callAnthropic(summary);
    } else {
      raw = await callOpenAI(summary);
    }
  } catch (err) {
    console.error('[advisor] LLM call failed, falling back to heuristic:', err);
    const response = runHeuristicAdvisor(scenario, forecast, prefs.emergencyFundMonths ?? 3);
    return { response, model: 'heuristic-v1', inputHash, fromCache: false };
  }

  // Parse + validate
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error('[advisor] JSON parse failed');
    const response = runHeuristicAdvisor(scenario, forecast, prefs.emergencyFundMonths ?? 3);
    return { response, model: 'heuristic-v1 (parse-fallback)', inputHash, fromCache: false };
  }

  const validated = AdvisorResponseSchema.safeParse(parsed);
  if (!validated.success) {
    console.error('[advisor] Schema validation failed:', validated.error.flatten());
    const response = runHeuristicAdvisor(scenario, forecast, prefs.emergencyFundMonths ?? 3);
    return { response, model: 'heuristic-v1 (validation-fallback)', inputHash, fromCache: false };
  }

  memCache.set(inputHash, validated.data);
  return { response: validated.data, model, inputHash, fromCache: false };
}
