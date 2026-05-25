import MealPlannerApp from '@/components/MealPlannerApp';
import { prisma } from '@/lib/prisma';
import { getISOWeek } from '@/lib/helpers';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { userId } = await auth();
  const { weekYear, weekNum } = getISOWeek(new Date());

  if (!userId) {
    const [recipes, weekEntries, recurring] = [[], [], []];
    return (
      <MealPlannerApp
        initialRecipes={recipes}
        initialWeek={weekEntries}
        initialRecurring={recurring}
        initialPrices={{}}
        initialChecked={{}}
      />
    );
  }

  const [recipes, weekEntries, recurring, prices, checks] = await Promise.all([
    prisma.recipe.findMany({ where: { userId }, include: { ingredients: true }, orderBy: { createdAt: 'asc' } }),
    prisma.weekEntry.findMany({ where: { userId, weekYear, weekNum } }),
    prisma.recurringMeal.findMany({ where: { userId } }),
    prisma.ingredientPrice.findMany({ where: { userId } }),
    prisma.shoppingCheck.findMany({ where: { userId, weekYear, weekNum } }),
  ]);

  const pricesObj: Record<string, number> = {};
  prices.forEach((p) => { pricesObj[p.name] = p.price; });

  const checksObj: Record<string, boolean> = {};
  checks.forEach((c) => { checksObj[c.itemKey] = c.checked; });

  return (
    <MealPlannerApp
      initialRecipes={recipes as any}
      initialWeek={weekEntries as any}
      initialRecurring={recurring}
      initialPrices={pricesObj}
      initialChecked={checksObj}
    />
  );
}
