// XLM <-> PHP price service.
//
// Tries to fetch the live rate from CoinGecko, caches it in memory for
// CACHE_TTL_MS, and falls back to a hardcoded rate if the request fails
// (offline, rate-limited, blocked region, etc.).
//
// Single source of truth for "how much is 1 XLM worth in PHP" across the app.

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=php";

/** Hardcoded fallback: 1 XLM ~= PHP 12.79. Used when the live fetch fails. */
export const XLM_PHP_FALLBACK = 12.79;

const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4_000;

interface CachedRate {
  rate: number;
  fetchedAt: number;
}

let cache: CachedRate | null = null;
let inflight: Promise<number> | null = null;

/** Synchronously read the most recent usable rate (cache or fallback). */
export function getCachedXlmToPhpRate(): number {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.rate;
  return XLM_PHP_FALLBACK;
}

/** Fetch a fresh rate from CoinGecko. Caches + de-duplicates in-flight calls. */
export async function fetchXlmToPhpRate(): Promise<number> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.rate;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
      const res = await fetch(COINGECKO_URL, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`CoinGecko responded ${res.status}`);
      const json = (await res.json()) as { stellar?: { php?: number } };
      const rate = json.stellar?.php;
      if (!rate || !Number.isFinite(rate) || rate <= 0) {
        throw new Error("CoinGecko payload missing stellar.php");
      }
      cache = { rate, fetchedAt: Date.now() };
      return rate;
    } catch {
      return XLM_PHP_FALLBACK;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** PHP amount -> XLM amount. */
export function phpToXlm(phpAmount: number, rate: number): number {
  if (rate <= 0) return 0;
  return phpAmount / rate;
}

/** XLM amount -> PHP amount. */
export function xlmToPhp(xlmAmount: number, rate: number): number {
  return xlmAmount * rate;
}
