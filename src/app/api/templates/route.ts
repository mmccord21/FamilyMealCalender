import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const templates = await prisma.weekTemplate.findMany({
    where: { userId },
    include: { meals: { include: { recipes: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { name, weekYear, weekNum } = await request.json();

  const sourceMeals = await prisma.dayMeal.findMany({
    where: { userId, weekYear, weekNum },
    include: { recipes: true },
  });

  const template = await prisma.weekTemplate.create({
    data: {
      userId,
      name,
      meals: {
        create: sourceMeals.map((meal) => ({
          dayKey: meal.dayKey,
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
        })),
      },
    },
    include: { meals: { include: { recipes: true } } },
  });

  return NextResponse.json(template);
}
