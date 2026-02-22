/**
 * Optional seed: creates a demo user + scenario.
 * Run: npx tsx prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  await db.user.upsert({
    where: { id: 'demo-user-001' },
    update: {},
    create: { id: 'demo-user-001', email: 'demo@wealthflow.local', name: 'Demo User' },
  });

  await db.scenario.upsert({
    where: { id: 'demo-scenario-001' },
    update: {},
    create: {
      id: 'demo-scenario-001',
      userId: 'demo-user-001',
      name: 'Main Forecast',
      currency: 'AED',
      startMonth: new Date(),
      months: 60,
      initialCash: 50000,
      incomes: { create: [{ label: 'Salary', amount: 20000, startMonth: 0, growthRate: 3 }] },
      expenses: {
        create: [
          { label: 'Rent', amount: 7000, category: 'rent', startMonth: 0, growthRate: 0 },
          { label: 'Living', amount: 5000, category: 'fixed', startMonth: 0, growthRate: 2 },
          { label: 'Entertainment', amount: 2000, category: 'discretionary', startMonth: 0, growthRate: 0 },
        ],
      },
      debts: { create: [{ label: 'Car loan', balance: 80000, annualRate: 6.5, minPayment: 1500, strategy: 'min' }] },
      investments: { create: [{ label: 'Stocks ETF', currentValue: 30000, monthlyContribution: 2000, expectedAnnualReturn: 0.09 }] },
    },
  });

  console.log('Seed complete.');
}

main().finally(() => db.$disconnect());
