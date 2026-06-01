import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const { id } = await params;

  const existing = await prisma.dayMeal.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return new NextResponse('Not found', { status: 404 });

  const body = await request.json();
  const meal = await prisma.dayMeal.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.guests !== undefined && { guests: body.guests }),
      ...(body.note !== undefined && { note: body.note }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
    },
    include: { recipes: { orderBy: { sortOrder: 'asc' } } },
  });

  return NextResponse.json(meal);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const { id } = await params;

  const existing = await prisma.dayMeal.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return new NextResponse('Not found', { status: 404 });

  await prisma.dayMeal.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
