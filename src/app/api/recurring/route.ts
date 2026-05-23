import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const recurring = await prisma.recurringMeal.findMany({ where: { userId } });
  return NextResponse.json(recurring);
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
