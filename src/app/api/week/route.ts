import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getISOWeek } from '@/lib/helpers';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const { searchParams } = new URL(request.url);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  // Compute the week year/num for the requested offset
  const today = new Date();
  today.setDate(today.getDate() + offset * 7);
  const { weekYear, weekNum } = getISOWeek(today);

  const entries = await prisma.weekEntry.findMany({
    where: { userId, weekYear, weekNum },
  });

  return NextResponse.json({ weekYear, weekNum, entries });
}
