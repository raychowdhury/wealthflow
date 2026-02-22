import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, isDbConfigured } from '@/lib/db';

const PrefsSchema = z.object({
  userId: z.string(),
  baseCurrency: z.string().optional(),
  riskProfile: z.enum(['low', 'med', 'high']).optional(),
  emergencyFundMonths: z.number().int().min(1).max(24).optional(),
  advisorTone: z.enum(['concise', 'neutral']).optional(),
});

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  // Return defaults when DB is not configured
  if (!isDbConfigured()) {
    return NextResponse.json({ userId, baseCurrency: 'AED', riskProfile: 'med', emergencyFundMonths: 3, advisorTone: 'concise' });
  }

  const pref = await db.userPreference.findUnique({ where: { userId } });
  return NextResponse.json(pref ?? { userId, baseCurrency: 'AED', riskProfile: 'med', emergencyFundMonths: 3, advisorTone: 'concise' });
}

export async function POST(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: 'Database not configured. Set DATABASE_URL in .env.local.' }, { status: 503 });
  }

  const body = await req.json();
  const parsed = PrefsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const { userId, ...data } = parsed.data;
  const pref = await db.userPreference.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
  return NextResponse.json(pref);
}
