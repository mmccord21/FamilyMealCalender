import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const { searchParams } = new URL(request.url);
  const weekYear = parseInt(searchParams.get('weekYear') ?? '0', 10);
  const weekNum  = parseInt(searchParams.get('weekNum')  ?? '0', 10);

  const rows = await prisma.shoppingQtyOverride.findMany({ where: { userId, weekYear, weekNum } });
  const record: Record<string, number> = {};
  rows.forEach((r) => { record[r.itemKey] = r.qty; });
  return NextResponse.json(record);
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const { itemKey, qty, weekYear, weekNum } = await request.json();

  const entry = await prisma.shoppingQtyOverride.upsert({
    where: { userId_itemKey_weekYear_weekNum: { userId, itemKey, weekYear, weekNum } },
    update: { qty },
    create: { userId, itemKey, qty, weekYear, weekNum },
  });
  return NextResponse.json(entry);
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const { searchParams } = new URL(request.url);
  const weekYear = parseInt(searchParams.get('weekYear') ?? '0', 10);
  const weekNum  = parseInt(searchParams.get('weekNum')  ?? '0', 10);

  await prisma.shoppingQtyOverride.deleteMany({ where: { userId, weekYear, weekNum } });
  return NextResponse.json({ success: true });
}
