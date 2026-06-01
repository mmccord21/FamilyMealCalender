import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { id } = await params;
  const { toWeekYear, toWeekNum } = await request.json();

  const template = await prisma.weekTemplate.findUnique({
    where: { id },
    include: { meals: { include: { recipes: true } } },
  });

  if (!template || template.userId !== userId) {
    return new NextResponse('Not Found', { status: 404 });
  }

  for (const meal of template.meals) {
    await prisma.dayMeal.create({
      data: {
        userId,
        dayKey: meal.dayKey,
        weekYear: toWeekYear,
        weekNum: toWeekNum,
        name: meal.name,
        sortOrder: meal.sortOrder,
        guests: meal.guests,
        note: meal.note,
        recipes: {
          create: meal.recipes.map((r) => ({
            recipeId: r.recipeId,
            sortOrder: r.sortOrder,
            includeInShopping: r.includeInShopping,
          })),
        },
      },
    });
  }

  return NextResponse.json({ count: template.meals.length });
}
