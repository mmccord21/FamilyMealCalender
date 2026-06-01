import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { dayKey, weekYear, weekNum, name, sortOrder, guests, note } = await request.json();

  const meal = await prisma.dayMeal.create({
    data: {
      userId,
      dayKey,
      weekYear,
      weekNum,
      name,
      sortOrder: sortOrder ?? 0,
      guests: guests ?? null,
      note: note ?? null,
    },
    include: { recipes: true },
  });

  return NextResponse.json(meal, { status: 201 });
}
