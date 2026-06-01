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
        initialHidden={{}}
        initialManualItems={[]}
        initialStores={[]}
      />
    );
  }

  const [recipes, dayMeals, recurring, prices, checks, hiddenRows, manualItems, userStores] = await Promise.all([
    prisma.recipe.findMany({ where: { userId }, include: { ingredients: true }, orderBy: { createdAt: 'asc' } }),
    prisma.dayMeal.findMany({
      where: { userId, weekYear, weekNum },
      include: { recipes: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ dayKey: 'asc' }, { sortOrder: 'asc' }],
    }),
    prisma.recurringMeal.findMany({ where: { userId } }),
    prisma.ingredientPrice.findMany({ where: { userId } }),
    prisma.shoppingCheck.findMany({ where: { userId, weekYear, weekNum } }),
    prisma.shoppingHiddenItem.findMany({ where: { userId, weekYear, weekNum } }),
    prisma.manualShoppingItem.findMany({ where: { userId, weekYear, weekNum } }),
    prisma.userStore.findMany({ where: { userId }, orderBy: { name: 'asc' } }),
  ]);

  const pricesObj: Record<string, number> = {};
  prices.forEach((p) => { pricesObj[p.name] = p.price; });

  const checksObj: Record<string, boolean> = {};
  checks.forEach((c) => { checksObj[c.itemKey] = c.checked; });

  const hiddenObj: Record<string, boolean> = {};
  hiddenRows.forEach((r) => { hiddenObj[r.itemKey] = true; });

  return (
    <MealPlannerApp
      initialRecipes={recipes as any}
      initialWeek={dayMeals as any}
      initialRecurring={recurring}
      initialPrices={pricesObj}
      initialChecked={checksObj}
      initialHidden={hiddenObj}
      initialManualItems={manualItems}
      initialStores={userStores}
    />
  );
}
