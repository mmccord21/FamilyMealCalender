import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, store } = await req.json();
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  // Update all ingredients for this user's recipes that match the name (case-insensitive)
  const userRecipes = await prisma.recipe.findMany({ where: { userId }, select: { id: true } });
  const recipeIds = userRecipes.map((r) => r.id);

  await prisma.ingredient.updateMany({
    where: {
      recipeId: { in: recipeIds },
      name: { equals: name.trim(), mode: 'insensitive' },
    },
    data: { store: store ?? '' },
  });

  return NextResponse.json({ ok: true });
}
