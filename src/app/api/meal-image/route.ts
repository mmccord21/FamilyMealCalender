import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const key = process.env.UNSPLASH_ACCESS_KEY;

  if (!key || !q.trim()) return NextResponse.json({ url: null });

  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(q)}&orientation=squarish&content_filter=high`,
      { headers: { Authorization: `Client-ID ${key}` } }
    );
    if (!res.ok) return NextResponse.json({ url: null });
    const data = await res.json();
    return NextResponse.json({ url: (data?.urls?.small as string) ?? null });
  } catch {
    return NextResponse.json({ url: null });
  }
}
