import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const { key } = await params;
  const body = await request.json();
  const { weekYear, weekNum, type, recipeId, guests, note, includeInShopping } = body;
  const shopFlag = includeInShopping !== false;

  const entry = await prisma.weekEntry.upsert({
    where: { userId_dayKey_weekYear_weekNum: { userId, dayKey: key, weekYear, weekNum } },
    update: { type, recipeId: recipeId ?? null, guests: guests ?? null, note: note ?? null, includeInShopping: shopFlag },
    create: { userId, dayKey: key, weekYear, weekNum, type, recipeId: recipeId ?? null, guests: guests ?? null, note: note ?? null, includeInShopping: shopFlag },
  });

  return NextResponse.json(entry);
}
