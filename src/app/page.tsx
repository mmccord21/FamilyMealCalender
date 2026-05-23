import MealPlannerApp from '@/components/MealPlannerApp';
import { prisma } from '@/lib/prisma';
import { getISOWeek } from '@/lib/helpers';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { weekYear, weekNum } = getISOWeek(new Date());

  const [recipes, weekEntries, recurring, prices, checks] = await Promise.all([
    prisma.recipe.findMany({ include: { ingredients: true }, orderBy: { createdAt: 'asc' } }),
    prisma.weekEntry.findMany({ where: { weekYear, weekNum } }),
    prisma.recurringMeal.findMany(),
    prisma.ingredientPrice.findMany(),
    prisma.shoppingCheck.findMany({ where: { weekYear, weekNum } }),
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
