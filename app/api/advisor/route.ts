import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { computeForecast } from '@/lib/forecast';
import { runAdvisor } from '@/lib/advisor';
import type { ScenarioInput } from '@/lib/types';

// ── Simple in-memory rate limiter ─────────────────────────────────────────────
// 10 requests per minute per IP. Resets on server restart.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    const resetAt = now + RATE_WINDOW_MS;
    rateLimitMap.set(ip, { count: 1, resetAt });
    return { ok: true, remaining: RATE_LIMIT - 1, resetAt };
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }
  return { ok: true, remaining: RATE_LIMIT - entry.count, resetAt: entry.resetAt };
}

// ── Inline scenario schema (no DB required) ───────────────────────────────────

const InlineScenarioSchema = z.object({
  id: z.string(),
  currency: z.string().default('AED'),
  months: z.number().int().min(1).max(360).default(60),
  initialCash: z.number().default(0),
  incomes: z.array(z.object({
    id: z.string(),
    label: z.string(),
    amount: z.number(),
    startMonth: z.number().int().default(0),
    endMonth: z.number().int().nullable().optional(),
    growthRate: z.number().default(0),
  })).default([]),
  expenses: z.array(z.object({
    id: z.string(),
    label: z.string(),
    amount: z.number(),
    category: z.enum(['fixed', 'discretionary', 'rent']).default('fixed'),
    startMonth: z.number().int().default(0),
    endMonth: z.number().int().nullable().optional(),
    growthRate: z.number().default(0),
  })).default([]),
  debts: z.array(z.object({
    id: z.string(),
    label: z.string(),
    balance: z.number(),
    annualRate: z.number(),
    minPayment: z.number(),
    strategy: z.enum(['min', 'aggressive', 'instant']).default('min'),
  })).default([]),
  investments: z.array(z.object({
    id: z.string(),
    label: z.string(),
    currentValue: z.number(),
    monthlyContribution: z.number().default(0),
    expectedAnnualReturn: z.number().default(0.07),
  })).default([]),
});

const AdvisorRequestSchema = z.object({
  // Either pass a full scenario inline OR a scenarioId to load from DB
  scenario: InlineScenarioSchema.optional(),
  scenarioId: z.string().optional(),
  preferences: z.object({
    riskProfile: z.enum(['low', 'med', 'high']).optional(),
    emergencyFundMonths: z.number().int().min(1).max(24).optional(),
    advisorTone: z.enum(['concise', 'neutral']).optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  // ── Rate limit check ──────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment before trying again.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(RATE_LIMIT),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rl.resetAt / 1000)),
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  const body = await req.json();
  const parsed = AdvisorRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { scenario: inlineScenario, scenarioId, preferences = {} } = parsed.data;

  let scenarioInput: ScenarioInput;

  if (inlineScenario) {
    // ── Inline path — no DB needed ────────────────────────────────────────
    scenarioInput = inlineScenario as ScenarioInput;
  } else if (scenarioId) {
    // ── DB path — load from Postgres ──────────────────────────────────────
    try {
      const { db } = await import('@/lib/db');
      const scenario = await db.scenario.findUnique({
        where: { id: scenarioId },
        include: { incomes: true, expenses: true, debts: true, investments: true },
      });
      if (!scenario) return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });

      scenarioInput = {
        id: scenario.id,
        currency: scenario.currency,
        months: scenario.months,
        initialCash: scenario.initialCash,
        incomes: scenario.incomes.map((i) => ({
          id: i.id, label: i.label, amount: i.amount,
          startMonth: i.startMonth, endMonth: i.endMonth, growthRate: i.growthRate,
        })),
        expenses: scenario.expenses.map((e) => ({
          id: e.id, label: e.label, amount: e.amount,
          category: e.category as 'fixed' | 'discretionary' | 'rent',
          startMonth: e.startMonth, endMonth: e.endMonth, growthRate: e.growthRate,
        })),
        debts: scenario.debts.map((d) => ({
          id: d.id, label: d.label, balance: d.balance,
          annualRate: d.annualRate, minPayment: d.minPayment,
          strategy: d.strategy as 'min' | 'aggressive' | 'instant',
        })),
        investments: scenario.investments.map((i) => ({
          id: i.id, label: i.label, currentValue: i.currentValue,
          monthlyContribution: i.monthlyContribution, expectedAnnualReturn: i.expectedAnnualReturn,
        })),
      };
    } catch (err) {
      console.error('[advisor] DB load failed:', err);
      return NextResponse.json({ error: 'DB unavailable and no inline scenario provided' }, { status: 503 });
    }
  } else {
    return NextResponse.json({ error: 'Provide scenario or scenarioId' }, { status: 422 });
  }

  // ── Run advisor (heuristic or LLM) ────────────────────────────────────────
  const forecast = computeForecast(scenarioInput);
  const { response, model, inputHash, fromCache } = await runAdvisor(scenarioInput, forecast, preferences);

  // ── Persist to DB (optional — skip if DB unavailable) ────────────────────
  const effectiveId = scenarioId ?? scenarioInput.id;
  const { isDbConfigured, db } = await import('@/lib/db');
  if (isDbConfigured()) {
    try {
      const existing = await db.advisorRun.findFirst({ where: { scenarioId: effectiveId, inputHash } });
      if (!existing) {
        await db.advisorRun.create({
          data: { scenarioId: effectiveId, model, inputHash, responseJson: response as object },
        });
      }
    } catch {
      // DB error — silently skip persistence
    }
  }

  return NextResponse.json({
    advisor: response,
    meta: { model, inputHash, fromCache, runAt: new Date().toISOString() },
    forecastSummary: forecast.summary,
  });
}

export async function GET(req: NextRequest) {
  const scenarioId = req.nextUrl.searchParams.get('scenarioId');
  if (!scenarioId) return NextResponse.json({ error: 'scenarioId required' }, { status: 400 });

  const { isDbConfigured, db } = await import('@/lib/db');
  if (!isDbConfigured()) return NextResponse.json({ advisor: null });

  try {
    const latest = await db.advisorRun.findFirst({
      where: { scenarioId },
      orderBy: { createdAt: 'desc' },
    });
    if (!latest) return NextResponse.json({ advisor: null });
    return NextResponse.json({
      advisor: latest.responseJson,
      meta: { model: latest.model, inputHash: latest.inputHash, runAt: latest.createdAt.toISOString(), fromCache: true },
    });
  } catch {
    return NextResponse.json({ advisor: null });
  }
}
