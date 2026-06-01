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
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              sub: { type: 'string', description: 'one-sentence description' },
              tags: {
                type: 'array',
                items: { type: 'string', enum: ['keto', 'meal-prep', '30 min', 'crowd-pleaser', 'fun night', 'date night'] },
                description: 'choose 0-3 that fit',
              },
              instructions: { type: 'string', description: 'step-by-step instructions, one step per line; empty string if none visible' },
              servings: { type: 'integer', description: 'number of servings the recipe makes, omit if unknown' },
              prepTime: { type: 'integer', description: 'prep time in minutes, omit if unknown' },
              cookTime: { type: 'integer', description: 'cook time in minutes, omit if unknown' },
              ingredients: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    name: { type: 'string' },
                    qty: { type: 'number', description: '0 if unclear' },
                    unit: { type: 'string' },
                    cat: { type: 'string', enum: ['proteins', 'produce', 'dairy', 'pantry'] },
                  },
                  required: ['name', 'qty', 'unit', 'cat'],
                },
              },
            },
            required: ['name', 'sub', 'tags', 'instructions', 'ingredients'],
          },
        },
      },
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: safeMediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: 'Extract the recipe from this image.',
          },
        ],
      }],
    });

    const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    data = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Could not read a recipe from that image' }, { status: 422 });
  }

  return NextResponse.json({
    name: String(data.name ?? ''),
    sub: String(data.sub ?? ''),
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    instructions: String(data.instructions ?? ''),
    servings: typeof data.servings === 'number' ? data.servings : 4,
    prepTime: typeof data.prepTime === 'number' ? data.prepTime : null,
    cookTime: typeof data.cookTime === 'number' ? data.cookTime : null,
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
