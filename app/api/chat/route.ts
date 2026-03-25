import OpenAI from 'openai';
import { NextRequest } from 'next/server';

// Use OpenAI if key is set, otherwise fall back to GitHub Models (works in Codespaces)
function createClient() {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-api-key-here') {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    };
  }
  if (process.env.GITHUB_TOKEN) {
    return {
      client: new OpenAI({
        baseURL: 'https://models.inference.ai.azure.com',
        apiKey: process.env.GITHUB_TOKEN,
      }),
      model: 'gpt-4o-mini',
    };
  }
  return null;
}

export async function POST(req: NextRequest) {
  const config = createClient();
  if (!config) {
    return new Response(
      JSON.stringify({ error: 'Ingen API-nøkkel konfigurert. Legg til OPENAI_API_KEY i .env.local.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const body = await req.json() as {
    messages: { role: 'user' | 'assistant'; content: string }[];
    context?: string;
  };

  const { messages, context } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: 'messages array is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const systemPrompt = `Du er en hjelpsom prosjektassistent for bulk Project Monitor-dashbordet.
Du hjelper brukere med å forstå prosjektdata, budsjett, milepæler, risikoer og status.
Svar på samme språk som brukeren bruker (norsk eller engelsk).
Vær presis og kortfattet. Bruk markdown-formatering der det er nyttig.

${context ? `\n## Gjeldende dashboarddata:\n${context}` : ''}`;

  let stream;
  try {
    stream = await config.client.chat.completions.create({
      model: config.model,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 1024,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OpenAI request failed';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stream error';
        controller.enqueue(encoder.encode(`\n\n[Feil: ${message}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
