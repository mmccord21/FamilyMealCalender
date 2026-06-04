import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const APP_TAGS = ['keto', 'meal-prep', '30 min', 'crowd-pleaser', 'fun night', 'date night'];

// JSON-LD recipeInstructions can be a string, an array of strings, an array of
// HowToStep objects, or HowToSection objects nesting HowToSteps. Flatten any
// of these into a clean newline-separated list of steps.
function parsePT(val: unknown): number | null {
  if (typeof val !== 'string') return null;
  const m = val.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return null;
  const total = (m[1] ? parseInt(m[1]) * 60 : 0) + (m[2] ? parseInt(m[2]) : 0);
  return total > 0 ? total : null;
}

function flattenInstructions(raw: unknown): string {
  const steps: string[] = [];
  const visit = (node: unknown) => {
    if (!node) return;
    if (typeof node === 'string') {
      const t = node.replace(/<[^>]+>/g, '').trim();
      if (t) steps.push(t);
      return;
    }
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (typeof node === 'object') {
      const o = node as Record<string, unknown>;
      if (Array.isArray(o.itemListElement)) { visit(o.itemListElement); return; }
      const t = typeof o.text === 'string' ? o.text : typeof o.name === 'string' ? o.name : '';
      const clean = t.replace(/<[^>]+>/g, '').trim();
      if (clean) steps.push(clean);
    }
  };
  visit(raw);
  return steps.join('\n');
}

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

  // Extract og:image for the recipe photo
  const ogMatch = html.match(/<meta[^>]+(?:property=["']og:image["'][^>]*content=["']([^"']+)["']|content=["']([^"']+)["'][^>]*property=["']og:image["'])/i);
  const ogImage = ogMatch?.[1] || ogMatch?.[2] || null;

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
  const instructions = flattenInstructions(schema.recipeInstructions);
  const schemaPrepTime = parsePT(schema.prepTime);
  const schemaCookTime = parsePT(schema.cookTime);

  // Instructions come straight from the JSON-LD schema (no AI needed). Claude
  // Haiku only does the lightweight structured work: parse free-text ingredient
  // strings into objects and map the site's keywords onto our tag vocabulary.
  let ingredients: Record<string, unknown>[] = [];
  let tags: string[] = [];
  let aiServings: number | null = null;
  let aiPrepTime: number | null = null;
  let aiCookTime: number | null = null;
  if (rawIngredients.length > 0) {
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
                ingredients: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      name: { type: 'string', description: 'ingredient name only, no prep instructions' },
                      qty: { type: 'number', description: '0 if unclear' },
                      unit: { type: 'string', description: 'empty string if none' },
                      cat: { type: 'string', enum: ['proteins', 'produce', 'dairy', 'pantry'] },
                    },
                    required: ['name', 'qty', 'unit', 'cat'],
                  },
                },
                tags: {
                  type: 'array',
                  items: { type: 'string', enum: APP_TAGS },
                  description: 'choose 0-3 that fit this recipe',
                },
                servings: { type: 'integer', description: 'number of servings the recipe makes, omit if unknown' },
                prepTime: { type: 'integer', description: 'prep time in minutes, omit if unknown' },
                cookTime: { type: 'integer', description: 'cook time in minutes, omit if unknown' },
              },
              required: ['ingredients', 'tags'],
            },
          },
        },
        messages: [{
          role: 'user',
          content: `Recipe: ${rawName}
Site keywords: ${rawKeywords || '(none)'}

Parse these ingredients and pick fitting tags.

Ingredients:
${rawIngredients.map((r, i) => `${i + 1}. ${r}`).join('\n')}`,
        }],
      });
      const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.ingredients)) ingredients = parsed.ingredients;
      if (Array.isArray(parsed.tags)) tags = parsed.tags.filter((t: string) => APP_TAGS.includes(t));
      if (typeof parsed.servings === 'number') aiServings = parsed.servings;
      if (typeof parsed.prepTime === 'number') aiPrepTime = parsed.prepTime;
      if (typeof parsed.cookTime === 'number') aiCookTime = parsed.cookTime;
    } catch { /* fall back to empty */ }
  }

  return NextResponse.json({
    name: rawName,
    sourceUrl: url,
    imageUrl: ogImage,
    sub: rawDescription.replace(/<[^>]+>/g, '').slice(0, 120),
    tags,
    instructions,
    servings: aiServings ?? 4,
    prepTime: schemaPrepTime ?? aiPrepTime,
    cookTime: schemaCookTime ?? aiCookTime,
    ingredients: ingredients.map((ing) => ({
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
