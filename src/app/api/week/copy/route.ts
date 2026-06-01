import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const { fromWeekYear, fromWeekNum, toWeekYear, toWeekNum } = await request.json();

    const sourceMeals = await prisma.dayMeal.findMany({
      where: { userId, weekYear: fromWeekYear, weekNum: fromWeekNum },
      include: { recipes: true },
    });

    for (const meal of sourceMeals) {
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

    return NextResponse.json({ count: sourceMeals.length });
  } catch {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
