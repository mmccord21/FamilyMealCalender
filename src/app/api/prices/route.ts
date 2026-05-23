import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const prices = await prisma.ingredientPrice.findMany({ where: { userId } });
  // Return as a record { name: price }
  const record: Record<string, number> = {};
  prices.forEach((p) => { record[p.name] = p.price; });
  return NextResponse.json(record);
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const body = await request.json();
  const { name, price } = body;

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const entry = await prisma.ingredientPrice.upsert({
    where: { userId_name: { userId, name } },
    update: { price: Number(price) },
    create: { userId, name, price: Number(price) },
  });

  return NextResponse.json(entry);
}
