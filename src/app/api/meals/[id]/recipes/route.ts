import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const { id } = await params;

  const meal = await prisma.dayMeal.findUnique({ where: { id } });
  if (!meal || meal.userId !== userId) return new NextResponse('Not found', { status: 404 });

  const { recipeId, sortOrder, includeInShopping } = await request.json();

  const dmr = await prisma.dayMealRecipe.create({
    data: {
      dayMealId: id,
      recipeId,
      sortOrder: sortOrder ?? 0,
      includeInShopping: includeInShopping !== false,
    },
  });

  return NextResponse.json(dmr, { status: 201 });
}
