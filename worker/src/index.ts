/**
 * Cloudflare Worker: proxies search-relevance ranking to TypeSafe's
 * SystemOne API. Exists only because the app ships as a static export
 * (Capacitor/Android) with no server of its own, so the TYPESAFE_API_KEY
 * can't live in the client bundle — this is the one place it's held.
 */

export interface Env {
  TYPESAFE_API_KEY: string;
  ALLOWED_ORIGIN?: string;
}

type Candidate = {
  id: string;
  title: string;
  note?: string;
  category?: string;
};

type RankRequest = {
  query: string;
  candidates: Candidate[];
};

type NoulAnswer = { type: "noul"; noul: number };

const MAX_CANDIDATES = 40;
const REQUEST_TIMEOUT_MS = 8000;

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.ALLOWED_ORIGIN || "*";

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders(origin) });
    }

    let body: RankRequest;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    const query = typeof body.query === "string" ? body.query.trim() : "";
    const candidates = Array.isArray(body.candidates) ? body.candidates.slice(0, MAX_CANDIDATES) : [];
    if (!query || candidates.length === 0) {
      return new Response(JSON.stringify({ scores: {} }), {
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    const questions: Record<string, unknown> = {};
    for (const c of candidates) {
      if (!c.id || !c.title) continue;
      questions[c.id] = {
        type: "noul",
        instructions: {
          search_query: query,
          item_title: c.title,
          item_note: c.note || undefined,
          item_category: c.category || undefined,
          question:
            "Would someone searching for the search_query consider this item a match? Count synonyms, near-synonyms, and closely related tool types as matches, not just exact word overlap.",
        },
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const upstream = await fetch("https://api.typesafe.ai/v1/systemone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.TYPESAFE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "jev-latest", state: {}, questions }),
        signal: controller.signal,
      });

      if (!upstream.ok) {
        return new Response(JSON.stringify({ error: "Upstream error", status: upstream.status }), {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      }

      const data = (await upstream.json()) as { answers?: Record<string, NoulAnswer> };
      const scores: Record<string, number> = {};
      for (const [id, answer] of Object.entries(data.answers || {})) {
        if (answer && typeof answer.noul === "number") scores[id] = answer.noul;
      }

      return new Response(JSON.stringify({ scores }), {
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Request failed or timed out" }), {
        status: 504,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    } finally {
      clearTimeout(timeout);
    }
  },
};

export default worker;
