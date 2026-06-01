import MealPlannerApp from '@/components/MealPlannerApp';
import { prisma } from '@/lib/prisma';
import { getISOWeek } from '@/lib/helpers';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { userId } = await auth();
  const { weekYear, weekNum } = getISOWeek(new Date());

  if (!userId) {
    return (
      <MealPlannerApp
        initialRecipes={[]}
        initialWeek={[]}
        initialRecurring={[]}
        initialPrices={{}}
        initialChecked={{}}
        initialManualItems={[]}
      />
    );
  }

  const [recipes, dayMeals, recurring, prices, checks, manualItems] = await Promise.all([
    prisma.recipe.findMany({ where: { userId }, include: { ingredients: true }, orderBy: { createdAt: 'asc' } }),
    prisma.dayMeal.findMany({
      where: { userId, weekYear, weekNum },
      include: { recipes: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ dayKey: 'asc' }, { sortOrder: 'asc' }],
    }),
    prisma.recurringMeal.findMany({ where: { userId } }),
    prisma.ingredientPrice.findMany({ where: { userId } }),
    prisma.shoppingCheck.findMany({ where: { userId, weekYear, weekNum } }),
    prisma.manualShoppingItem.findMany({ where: { userId, weekYear, weekNum } }),
  ]);

  const pricesObj: Record<string, number> = {};
  prices.forEach((p) => { pricesObj[p.name] = p.price; });

  const checksObj: Record<string, boolean> = {};
  checks.forEach((c) => { checksObj[c.itemKey] = c.checked; });

  return (
    <MealPlannerApp
      initialRecipes={recipes as any}
      initialWeek={dayMeals as any}
      initialRecurring={recurring}
      initialPrices={pricesObj}
      initialChecked={checksObj}
      initialManualItems={manualItems}
    />
  );
}
