import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_UNITS = ['whole', 'count', 'oz', 'lbs', 'g', 'kg', 'tsp', 'tbsp', 'cups', 'fl oz', 'ml', 'L', 'can', 'bottle', 'bag', 'bunch', 'clove', 'slice'];

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { transcript } = await request.json();
  if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
    return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
  }

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: 'You are a pantry parser. Extract every food item, ingredient, or grocery product mentioned in spoken text. Convert natural language quantities accurately: "a dozen" → 12, "half" → 0.5, "a couple" → 2, "a few" → 3, "some" → 1, "a gallon" → 1 with unit L, "a pound" → 1 with unit lbs, "a can" → 1 with unit can. Use lowercase for item names. Ignore filler words and non-food items.',
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    name: { type: 'string', description: 'food item name, lowercase, no prep notes' },
                    qty: { type: 'number', description: 'numeric quantity; use 1 if unspecified' },
                    unit: {
                      type: 'string',
                      enum: VALID_UNITS,
                      description: 'best matching unit; use "whole" if none mentioned',
                    },
                  },
                  required: ['name', 'qty', 'unit'],
                },
              },
            },
            required: ['items'],
          },
        },
      },
      messages: [{ role: 'user', content: transcript.slice(0, 4000) }],
    });

    const out = msg.content[0]?.type === 'text' ? msg.content[0].text : '{"items":[]}';
    const data = JSON.parse(out) as { items: { name: string; qty: number; unit: string }[] };
    return NextResponse.json({ items: Array.isArray(data.items) ? data.items : [] });
  } catch {
    return NextResponse.json({ error: 'Could not parse transcript' }, { status: 422 });
  }
}
