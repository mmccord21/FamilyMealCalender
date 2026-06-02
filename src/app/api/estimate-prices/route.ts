import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are a US grocery pricing assistant. Given a list of grocery ingredients with quantities, return a realistic estimated retail price in USD for each item. Use typical supermarket prices (not wholesale or premium specialty). Return prices as the total cost for the amount listed, not per-unit price.`;

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const body = await request.json();
  const items: { name: string; amount: string }[] = body.items ?? [];
  if (!items.length) return NextResponse.json({ prices: {} });

  const itemList = items.map((i) => `- ${i.name} (${i.amount})`).join('\n');

  let estimates: { name: string; price: number }[] = [];
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: SYSTEM,
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              estimates: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    name: { type: 'string', description: 'lowercase ingredient name, matching input exactly' },
                    price: { type: 'number', description: 'estimated USD price for the amount listed, rounded to nearest 0.25' },
                  },
                  required: ['name', 'price'],
                },
              },
            },
            required: ['estimates'],
          },
        },
      },
      messages: [{
        role: 'user',
        content: `Estimate grocery prices for these items:\n${itemList}`,
      }],
    });

    const out = msg.content[0]?.type === 'text' ? msg.content[0].text : '{}';
    const parsed = JSON.parse(out) as { estimates: { name: string; price: number }[] };
    estimates = parsed.estimates ?? [];
  } catch {
    return NextResponse.json({ error: 'Failed to estimate prices' }, { status: 502 });
  }

  const prices: Record<string, number> = {};
  estimates.forEach(({ name, price }) => {
    const key = name.toLowerCase().trim();
    if (key && typeof price === 'number' && price >= 0) {
      prices[key] = Math.round(price * 100) / 100;
    }
  });

  return NextResponse.json({ prices });
}
