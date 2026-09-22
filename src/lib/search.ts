import { useEffect, useState } from "react";

/**
 * Shared free-text search matching, used by every search box in the app.
 *
 * Substring matching alone misses synonyms ("driver" won't find "drill") and
 * ranks purely by list order. To fix that without making the search box feel
 * laggy or network-dependent, matching happens in two layers:
 *
 *  1. Instant, local, synchronous substring matching — the baseline. Always
 *     available, works offline, zero latency.
 *  2. A debounced call to a relevance-ranking endpoint (backed by a
 *     TypeSafe Noul judgment per candidate) that can also surface items the
 *     substring pass missed. Its result only ever adds to or reorders the
 *     substring result — a slow or failed network call never removes a
 *     match the user can already see.
 */

export type Searchable = {
  id: string;
  title: string;
  note?: string;
  category?: string;
};

export function matchesQuery(item: { title: string }, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return item.title.toLowerCase().includes(q);
}

const RANK_ENDPOINT = process.env.NEXT_PUBLIC_SEARCH_RANK_URL;
const MIN_QUERY_LENGTH = 2;
const MAX_CANDIDATES = 40;
const DEBOUNCE_MS = 300;
/** Below this, treat the item as not actually relevant rather than a weak match. */
const RELEVANCE_THRESHOLD = 0.5;

async function fetchRelevanceScores(
  query: string,
  candidates: Searchable[],
  signal: AbortSignal
): Promise<Record<string, number>> {
  if (!RANK_ENDPOINT) return {};
  const res = await fetch(RANK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, candidates: candidates.slice(0, MAX_CANDIDATES) }),
    signal,
  });
  if (!res.ok) throw new Error(`search-rank request failed: ${res.status}`);
  const data = (await res.json()) as { scores?: Record<string, number> };
  return data.scores || {};
}

/**
 * Reorders (and can extend) a substring-matched result list using semantic
 * relevance scores, once they arrive. Falls back to the substring order —
 * unchanged — whenever scores aren't available yet, the query is too short
 * to bother ranking, or the network call fails.
 */
export function useSemanticRanking<T extends Searchable>(
  query: string,
  allCandidates: T[],
  substringMatches: T[]
): T[] {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [scoredQuery, setScoredQuery] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!RANK_ENDPOINT || trimmed.length < MIN_QUERY_LENGTH) {
      setScores({});
      setScoredQuery(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const result = await fetchRelevanceScores(trimmed, allCandidates, controller.signal);
        setScores(result);
        setScoredQuery(trimmed);
      } catch {
        // Network hiccup or timeout: silently keep substring-only results.
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // allCandidates is derived fresh each render from app state; comparing by
    // length + query is enough to avoid re-ranking on every keystroke render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, allCandidates.length]);

  if (scoredQuery !== query.trim() || Object.keys(scores).length === 0) {
    return substringMatches;
  }

  const substringIds = new Set(substringMatches.map((m) => m.id));
  const relevantFromScores = allCandidates.filter(
    (c) => !substringIds.has(c.id) && (scores[c.id] ?? 0) >= RELEVANCE_THRESHOLD
  );

  return [...substringMatches, ...relevantFromScores].sort((a, b) => {
    const scoreDiff = (scores[b.id] ?? 0) - (scores[a.id] ?? 0);
    if (Math.abs(scoreDiff) > 0.01) return scoreDiff;
    return 0; // stable: preserve original relative order for near-ties
  });
}
