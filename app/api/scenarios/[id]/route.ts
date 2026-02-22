import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const scenario = await db.scenario.findUnique({
    where: { id: params.id },
    include: { incomes: true, expenses: true, debts: true, investments: true },
  });
  if (!scenario) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(scenario);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  await db.scenario.update({
    where: { id: params.id },
    data: {
      name: body.name,
      currency: body.currency,
      months: body.months,
      initialCash: body.initialCash,
      updatedAt: new Date(),
    },
  });

  // Replace child records if provided
  if (body.incomes) {
    await db.income.deleteMany({ where: { scenarioId: params.id } });
    if (body.incomes.length > 0) await db.income.createMany({ data: body.incomes.map((i: Record<string, unknown>) => ({ ...i, scenarioId: params.id })) });
  }
  if (body.expenses) {
    await db.expense.deleteMany({ where: { scenarioId: params.id } });
    if (body.expenses.length > 0) await db.expense.createMany({ data: body.expenses.map((e: Record<string, unknown>) => ({ ...e, scenarioId: params.id })) });
  }
  if (body.debts) {
    await db.debt.deleteMany({ where: { scenarioId: params.id } });
    if (body.debts.length > 0) await db.debt.createMany({ data: body.debts.map((d: Record<string, unknown>) => ({ ...d, scenarioId: params.id })) });
  }
  if (body.investments) {
    await db.investment.deleteMany({ where: { scenarioId: params.id } });
    if (body.investments.length > 0) await db.investment.createMany({ data: body.investments.map((i: Record<string, unknown>) => ({ ...i, scenarioId: params.id })) });
  }

  const updated = await db.scenario.findUnique({
    where: { id: params.id },
    include: { incomes: true, expenses: true, debts: true, investments: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await db.scenario.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
