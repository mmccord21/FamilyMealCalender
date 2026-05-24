import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type ValidMediaType = typeof VALID_MEDIA_TYPES[number];

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { imageBase64, mediaType } = await request.json();
  if (!imageBase64) return NextResponse.json({ error: 'Image required' }, { status: 400 });

  const safeMediaType: ValidMediaType = VALID_MEDIA_TYPES.includes(mediaType)
    ? mediaType
    : 'image/jpeg';

  let data: Record<string, unknown>;
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: safeMediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: `Extract the recipe from this image and return a single JSON object with these fields:
- name: recipe name (string)
- sub: one-sentence description (string)
- tags: array of 1-3 tags chosen from: keto, meal-prep, 30 min, crowd-pleaser, fun night, date night
- ingredients: array of objects with: name (string), qty (number, 0 if unclear), unit (string), cat (one of: proteins, produce, dairy, pantry)

Return ONLY the JSON object, no markdown, no other text.`,
          },
        ],
      }],
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    data = JSON.parse(match[0]);
  } catch {
    return NextResponse.json({ error: 'Could not read a recipe from that image' }, { status: 422 });
  }

  return NextResponse.json({
    name: String(data.name ?? ''),
    sub: String(data.sub ?? ''),
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    ingredients: (Array.isArray(data.ingredients) ? data.ingredients as Record<string, unknown>[] : []).map((ing) => ({
      id: Math.random().toString(36).substring(7),
      recipeId: '',
      name: String(ing.name ?? ''),
      qty: Number(ing.qty) || 0,
      unit: String(ing.unit ?? ''),
      cat: ['proteins', 'produce', 'dairy', 'pantry'].includes(String(ing.cat))
        ? ing.cat
        : 'pantry',
      store: 'sprouts',
      noScale: false,
    })),
  });
}
