import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { id } = await params;

  const template = await prisma.weekTemplate.findUnique({ where: { id } });
  if (!template || template.userId !== userId) {
    return new NextResponse('Not Found', { status: 404 });
  }

  await prisma.weekTemplate.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
