import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

async function verifyOwnership(userId: string, dmrId: string, mealId: string) {
  const dmr = await prisma.dayMealRecipe.findUnique({
    where: { id: dmrId },
    include: { dayMeal: { select: { userId: true, id: true } } },
  });
  if (!dmr || dmr.dayMeal.userId !== userId || dmr.dayMealId !== mealId) return null;
  return dmr;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; dmrId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const { id, dmrId } = await params;

  const dmr = await verifyOwnership(userId, dmrId, id);
  if (!dmr) return new NextResponse('Not found', { status: 404 });

  const body = await request.json();
  const updated = await prisma.dayMealRecipe.update({
    where: { id: dmrId },
    data: {
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.includeInShopping !== undefined && { includeInShopping: body.includeInShopping }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; dmrId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const { id, dmrId } = await params;

  const dmr = await verifyOwnership(userId, dmrId, id);
  if (!dmr) return new NextResponse('Not found', { status: 404 });

  await prisma.dayMealRecipe.delete({ where: { id: dmrId } });

  return new NextResponse(null, { status: 204 });
}
