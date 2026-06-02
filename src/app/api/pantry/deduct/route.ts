import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { dayMealId } = await req.json();
  if (!dayMealId) return NextResponse.json({ error: 'dayMealId required' }, { status: 400 });

  const meal = await prisma.dayMeal.findFirst({
    where: { id: dayMealId, userId },
    include: {
      recipes: true,
    },
  });
  if (!meal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const recipeIds = meal.recipes.map((dmr) => dmr.recipeId);
  const recipes = await prisma.recipe.findMany({
    where: { id: { in: recipeIds }, userId },
    include: { ingredients: true },
  });

  const pantryItems = await prisma.pantryItem.findMany({ where: { userId } });
  const pantryMap = new Map(pantryItems.map((p) => [p.name, p]));

  const updates: { name: string; newQty: number; unit: string }[] = [];

  for (const dmr of meal.recipes) {
    const recipe = recipes.find((r) => r.id === dmr.recipeId);
    if (!recipe) continue;
    const scale = meal.guests != null && recipe.servings > 0
      ? meal.guests / recipe.servings
      : 1;

    for (const ing of recipe.ingredients) {
      const key = ing.name.toLowerCase().trim();
      const pantry = pantryMap.get(key);
      if (!pantry) continue;
      if (pantry.unit !== (ing.unit ?? '')) continue;
      const deduct = ing.noScale ? ing.qty : ing.qty * scale;
      const newQty = Math.max(0, pantry.qty - deduct);
      updates.push({ name: key, newQty, unit: pantry.unit });
      pantryMap.set(key, { ...pantry, qty: newQty });
    }
  }

  await Promise.all([
    prisma.dayMeal.update({ where: { id: dayMealId }, data: { cookedAt: new Date() } }),
    ...updates.map(({ name, newQty, unit }) =>
      prisma.pantryItem.update({
        where: { userId_name: { userId, name } },
        data: { qty: newQty, unit },
      })
    ),
  ]);

  const updatedMeal = await prisma.dayMeal.findFirst({
    where: { id: dayMealId },
    include: { recipes: { orderBy: { sortOrder: 'asc' } } },
  });
  const updatedPantry = await prisma.pantryItem.findMany({ where: { userId }, orderBy: { name: 'asc' } });

  return NextResponse.json({ meal: updatedMeal, pantryItems: updatedPantry });
}
