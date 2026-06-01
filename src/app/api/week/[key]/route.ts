import { NextResponse } from 'next/server';

export async function PUT() {
  return new NextResponse('Gone — use /api/meals', { status: 410 });
}
