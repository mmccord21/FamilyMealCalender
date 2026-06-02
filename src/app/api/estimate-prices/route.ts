import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const body = await request.json();
  const items: { name: string; qty: number; unit: string }[] = body.items ?? [];
  if (!items.length) return NextResponse.json({ prices: {} });

  // Use indexed list so the AI can't misname items — we map back by index
  const itemList = items.map((i, idx) => {
    const unitLabel = i.unit ? i.unit : 'each';
    return `${idx + 1}. ${i.name} — need: ${i.qty > 0 ? i.qty : 1} ${unitLabel}`;
  }).join('\n');

  let rawEstimates: { index: number; price_per_unit: number }[] = [];
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
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
                    index: { type: 'integer', description: 'the item number from the list' },
                    price_per_unit: { type: 'number', description: 'estimated USD price per one unit (per lb, per cup, per each, etc.) at a typical US supermarket' },
                  },
                  required: ['index', 'price_per_unit'],
                },
              },
            },
            required: ['estimates'],
          },
        },
      },
      messages: [{
        role: 'user',
        content: `Estimate the price PER UNIT for each grocery item below. Return price per single unit (per lb, per cup, per each, etc.) — NOT the total for the quantity listed.\n\nItems:\n${itemList}`,
      }],
    });

    const out = msg.content[0]?.type === 'text' ? msg.content[0].text : '{}';
    const parsed = JSON.parse(out) as { estimates: { index: number; price_per_unit: number }[] };
    rawEstimates = parsed.estimates ?? [];
  } catch {
    return NextResponse.json({ error: 'Failed to estimate prices' }, { status: 502 });
  }

  const prices: Record<string, number> = {};
  rawEstimates.forEach(({ index, price_per_unit }) => {
    const item = items[index - 1];
    if (item && typeof price_per_unit === 'number' && price_per_unit >= 0) {
      prices[item.name] = Math.round(price_per_unit * 100) / 100;
    }
  });

  return NextResponse.json({ prices });
}
