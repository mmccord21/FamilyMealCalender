import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const { searchParams } = new URL(request.url);
  const weekYear = parseInt(searchParams.get('weekYear') ?? '0', 10);
  const weekNum  = parseInt(searchParams.get('weekNum')  ?? '0', 10);

  const checks = await prisma.shoppingCheck.findMany({ where: { userId, weekYear, weekNum } });
  const record: Record<string, boolean> = {};
  checks.forEach((c) => { record[c.itemKey] = c.checked; });
  return NextResponse.json(record);
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const body = await request.json();
  const { itemKey, checked, weekYear, weekNum } = body;

  const entry = await prisma.shoppingCheck.upsert({
    where: { userId_itemKey_weekYear_weekNum: { userId, itemKey, weekYear, weekNum } },
    update: { checked },
    create: { userId, itemKey, checked, weekYear, weekNum },
  });

  return NextResponse.json(entry);
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const { searchParams } = new URL(request.url);
  const weekYear = parseInt(searchParams.get('weekYear') ?? '0', 10);
  const weekNum  = parseInt(searchParams.get('weekNum')  ?? '0', 10);

  await prisma.shoppingCheck.deleteMany({ where: { userId, weekYear, weekNum } });
  return NextResponse.json({ success: true });
}
