import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const { searchParams } = new URL(request.url);
  const weekYear = parseInt(searchParams.get('weekYear') ?? '0', 10);
  const weekNum  = parseInt(searchParams.get('weekNum')  ?? '0', 10);
  const items = await prisma.manualShoppingItem.findMany({ where: { userId, weekYear, weekNum } });
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const { name, weekYear, weekNum } = await request.json();
  const trimmed = name?.trim();
  if (!trimmed) return new NextResponse('Bad Request', { status: 400 });
  const item = await prisma.manualShoppingItem.create({
    data: { userId, name: trimmed, weekYear, weekNum },
  });
  return NextResponse.json(item);
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return new NextResponse('Bad Request', { status: 400 });
  await prisma.manualShoppingItem.deleteMany({ where: { id, userId } });
  return NextResponse.json({ success: true });
}
