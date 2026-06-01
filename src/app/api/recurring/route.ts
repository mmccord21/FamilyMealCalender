import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const recurring = await prisma.recurringMeal.findMany({ where: { userId } });
  return NextResponse.json(recurring);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const body = await request.json();
  const { label } = body;
  if (!label) return new NextResponse('Bad Request', { status: 400 });

  const key = label.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
  const created = await prisma.recurringMeal.create({
    data: { userId, key, label },
  });
  return NextResponse.json(created);
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const body = await request.json();
  const { key, recipeId } = body;

  const entry = await prisma.recurringMeal.upsert({
    where: { userId_key: { userId, key } },
    update: { recipeId: recipeId ?? null },
    create: { userId, key, label: key === 'brunch' ? 'Brunch' : 'Weekday Lunch Prep', recipeId: recipeId ?? null },
  });

  return NextResponse.json(entry);
}

export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const body = await request.json();
  const { key, label } = body;
  if (!key || !label) return new NextResponse('Bad Request', { status: 400 });

  const existing = await prisma.recurringMeal.findUnique({ where: { userId_key: { userId, key } } });
  if (!existing) return new NextResponse('Not Found', { status: 404 });

  const updated = await prisma.recurringMeal.update({
    where: { userId_key: { userId, key } },
    data: { label },
  });
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  if (!key) return new NextResponse('Bad Request', { status: 400 });

  const existing = await prisma.recurringMeal.findUnique({ where: { userId_key: { userId, key } } });
  if (!existing) return new NextResponse('Not Found', { status: 404 });

  await prisma.recurringMeal.delete({ where: { userId_key: { userId, key } } });
  return NextResponse.json({ success: true });
}
