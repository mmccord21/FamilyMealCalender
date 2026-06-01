import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const recipes = await prisma.recipe.findMany({
    where: { userId },
    include: { ingredients: true },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(recipes);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const body = await request.json();
  const { emoji, name, sub, tags, color, instructions, servings, prepTime, cookTime, ingredients } = body;

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  try {
    const recipe = await prisma.recipe.create({
      data: {
        userId,
        emoji: emoji || '🍽️',
        name,
        sub: sub || '',
        tags: tags || [],
        color: color || '#888888',
        instructions: instructions || null,
        servings: servings ?? 4,
        prepTime: prepTime ?? null,
        cookTime: cookTime ?? null,
      },
    });

    if (ingredients?.length) {
      await prisma.ingredient.createMany({
        data: ingredients.map((ing: any) => ({
          recipeId: recipe.id,
          name: ing.name,
          qty: Number(ing.qty) || 0,
          unit: ing.unit || '',
          cat: ing.cat || 'pantry',
          store: ing.store || 'sprouts',
          noScale: !!ing.noScale,
        })),
      });
    }

    const saved = await prisma.recipe.findUnique({
      where: { id: recipe.id },
      include: { ingredients: true },
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('[POST /api/recipes]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
