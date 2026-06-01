import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({ where: { id }, include: { ingredients: true } });
  if (!recipe || recipe.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(recipe);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const { emoji, name, sub, tags, color, instructions, servings, prepTime, cookTime, ingredients } = body;

  const existing = await prisma.recipe.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return new NextResponse('Unauthorized', { status: 401 });

  await prisma.ingredient.deleteMany({ where: { recipeId: id } });

  await prisma.recipe.update({
    where: { id },
    data: {
      emoji,
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
        recipeId: id,
        name: ing.name,
        qty: Number(ing.qty) || 0,
        unit: ing.unit || '',
        cat: ing.cat || 'pantry',
        store: ing.store || 'sprouts',
        noScale: !!ing.noScale,
      })),
    });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: { ingredients: true },
  });

  return NextResponse.json(recipe);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const { id } = await params;
  
  const existing = await prisma.recipe.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return new NextResponse('Unauthorized', { status: 401 });

  await prisma.dayMealRecipe.deleteMany({ where: { recipeId: id } });
  await prisma.recurringMeal.updateMany({ where: { recipeId: id }, data: { recipeId: null } });
  await prisma.recipe.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
