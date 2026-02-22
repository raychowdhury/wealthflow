import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isDbConfigured } from '@/lib/db';

const DB_REQUIRED = NextResponse.json(
  { error: 'Database not configured. Set DATABASE_URL in .env.local.' },
  { status: 503 }
);

const ScenarioCreateSchema = z.object({
  userId: z.string(),
  name: z.string().min(1),
  currency: z.string().default('AED'),
  startMonth: z.string().datetime().optional(),
  months: z.number().int().min(1).max(360).default(60),
  initialCash: z.number().default(0),
  incomes: z.array(z.object({
    label: z.string(),
    amount: z.number(),
    startMonth: z.number().int().default(0),
    endMonth: z.number().int().nullable().optional(),
    growthRate: z.number().default(0),
  })).default([]),
  expenses: z.array(z.object({
    label: z.string(),
    amount: z.number(),
    category: z.enum(['fixed', 'discretionary', 'rent']).default('fixed'),
    startMonth: z.number().int().default(0),
    endMonth: z.number().int().nullable().optional(),
    growthRate: z.number().default(0),
  })).default([]),
  debts: z.array(z.object({
    label: z.string(),
    balance: z.number(),
    annualRate: z.number(),
    minPayment: z.number(),
    strategy: z.enum(['min', 'aggressive', 'instant']).default('min'),
  })).default([]),
  investments: z.array(z.object({
    label: z.string(),
    currentValue: z.number(),
    monthlyContribution: z.number().default(0),
    expectedAnnualReturn: z.number().default(7),
  })).default([]),
});

export async function GET(req: NextRequest) {
  if (!isDbConfigured()) return DB_REQUIRED;

  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const scenarios = await db.scenario.findMany({
    where: { userId },
    include: { incomes: true, expenses: true, debts: true, investments: true },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json(scenarios);
}

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) return DB_REQUIRED;

  const body = await req.json();
  const parsed = ScenarioCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { userId, name, currency, startMonth, months, initialCash, incomes, expenses, debts, investments } = parsed.data;

  // Upsert user (demo: create if not exists)
  await db.user.upsert({ where: { id: userId }, update: {}, create: { id: userId, email: `${userId}@demo.local` } });

  const scenario = await db.scenario.create({
    data: {
      userId,
      name,
      currency,
      startMonth: startMonth ? new Date(startMonth) : new Date(),
      months,
      initialCash,
      incomes: { create: incomes },
      expenses: { create: expenses },
      debts: { create: debts },
      investments: { create: investments },
    },
    include: { incomes: true, expenses: true, debts: true, investments: true },
  });

  return NextResponse.json(scenario, { status: 201 });
}
