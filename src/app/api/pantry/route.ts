import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const items = await prisma.pantryItem.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, qty, unit, lowStockQty } = await req.json();
  if (!name?.trim() || !unit?.trim()) {
    return NextResponse.json({ error: 'name and unit required' }, { status: 400 });
  }

  const key = name.toLowerCase().trim();
  const item = await prisma.pantryItem.upsert({
    where: { userId_name: { userId, name: key } },
    update: { qty: Number(qty), unit: unit.trim(), lowStockQty: lowStockQty != null ? Number(lowStockQty) : null },
    create: { userId, name: key, qty: Number(qty), unit: unit.trim(), lowStockQty: lowStockQty != null ? Number(lowStockQty) : null },
  });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const name = new URL(req.url).searchParams.get('name');
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  await prisma.pantryItem.deleteMany({ where: { userId, name: name.toLowerCase().trim() } });
  return NextResponse.json({ ok: true });
}
