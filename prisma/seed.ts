import { PrismaClient } from '@prisma/client';
import DEF_RECIPES from '../src/lib/defaultData';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Recipes
  for (const r of DEF_RECIPES) {
    const existing = await prisma.recipe.findFirst({ where: { name: r.name, userId: 'system' } });
    if (existing) { console.log(`  skip: ${r.name}`); continue; }

    await prisma.recipe.create({
      data: {
        userId: 'system',
        emoji: r.emoji,
        name: r.name,
        sub: r.sub ?? '',
        tags: r.tags,
        color: r.color,
        ingredients: {
          create: r.ingredients.map((ing) => ({
            name: ing.name,
            qty: ing.qty,
            unit: ing.unit ?? '',
            cat: ing.cat,
            store: ing.store,
            noScale: ing.noScale,
          })),
        },
      },
    });
    console.log(`  ✓ ${r.emoji} ${r.name}`);
  }

  // Recurring meals (brunch + lunch)
  const smoked = await prisma.recipe.findFirst({ where: { name: 'Smoked Salmon Frittata', userId: 'system' } });
  const greek  = await prisma.recipe.findFirst({ where: { name: 'Greek Chicken Bowls', userId: 'system' } });

  await prisma.recurringMeal.upsert({
    where: { userId_key: { userId: 'system', key: 'brunch' } },
    update: { recipeId: smoked?.id },
    create: { userId: 'system', key: 'brunch', label: 'Brunch', recipeId: smoked?.id },
  });
  await prisma.recurringMeal.upsert({
    where: { userId_key: { userId: 'system', key: 'lunch' } },
    update: { recipeId: greek?.id },
    create: { userId: 'system', key: 'lunch', label: 'Weekday Lunch Prep', recipeId: greek?.id },
  });

  console.log('✅ Seed complete!');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
