import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { url } = await request.json();
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecipeImporter/1.0)' },
    });
    html = await res.text();
  } catch {
    return NextResponse.json({ error: 'Could not fetch that URL' }, { status: 422 });
  }

  // Extract all JSON-LD blocks and find one with @type Recipe
  const ldMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  let schema: Record<string, unknown> | null = null;
  for (const match of ldMatches) {
    try {
      const data = JSON.parse(match[1]);
      const items: unknown[] = Array.isArray(data['@graph']) ? data['@graph'] : [data];
      const recipe = items.find((i): i is Record<string, unknown> => {
        if (typeof i !== 'object' || i === null) return false;
        const t = (i as Record<string, unknown>)['@type'];
        return t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'));
      });
      if (recipe) { schema = recipe; break; }
    } catch { /* skip malformed blocks */ }
  }

  if (!schema) {
    return NextResponse.json({ error: 'No recipe found at this URL. Try a different link.' }, { status: 422 });
  }

  const rawIngredients: string[] = Array.isArray(schema.recipeIngredient)
    ? (schema.recipeIngredient as string[])
    : [];

  const rawDescription = typeof schema.description === 'string' ? schema.description : '';
  const rawKeywords = typeof schema.keywords === 'string' ? schema.keywords : '';
  const rawName = typeof schema.name === 'string' ? schema.name : '';

  // Use Claude Haiku to parse ingredient strings into structured objects
  let ingredients: unknown[] = [];
  if (rawIngredients.length > 0) {
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Parse these recipe ingredients into a JSON array. For each, extract:
- name: just the ingredient name, no prep instructions
- qty: numeric quantity (0 if unclear)
- unit: unit string (empty string if none)
- cat: one of exactly: proteins, produce, dairy, pantry

Ingredients:
${rawIngredients.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Return ONLY a JSON array, no other text. Example:
[{"name":"flour","qty":2,"unit":"cups","cat":"pantry"}]`,
        }],
      });
      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      const match = text.match(/\[[\s\S]*\]/);
      if (match) ingredients = JSON.parse(match[0]);
    } catch { /* fall back to empty */ }
  }

  return NextResponse.json({
    name: rawName,
    sub: rawDescription.replace(/<[^>]+>/g, '').slice(0, 120),
    tags: rawKeywords.split(',').map((k: string) => k.trim()).filter(Boolean).slice(0, 5),
    ingredients: (ingredients as Record<string, unknown>[]).map((ing) => ({
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
