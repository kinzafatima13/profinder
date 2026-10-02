/**
 * Rate limiter with per-domain queuing, delays, and exponential backoff retry logic.
 * Respects OpenAlex (polite pool) and Semantic Scholar (1 req/sec default limit).
 */

type RequestQueueItem<T> = {
  fn: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

class DomainRateLimiter {
  private queue: RequestQueueItem<unknown>[] = [];
  private isProcessing = false;
  private minIntervalMs: number;
  private lastRequestTime = 0;

  constructor(minIntervalMs = 500) {
    this.minIntervalMs = minIntervalMs;
  }

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve: resolve as (value: unknown) => void, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLast = now - this.lastRequestTime;
      if (timeSinceLast < this.minIntervalMs) {
        await new Promise((r) => setTimeout(r, this.minIntervalMs - timeSinceLast));
      }

      const item = this.queue.shift();
      if (!item) break;

      this.lastRequestTime = Date.now();
      try {
        const result = await item.fn();
        item.resolve(result);
      } catch (err) {
        item.reject(err);
      }
    }

    this.isProcessing = false;
  }
}

const openAlexLimiter = new DomainRateLimiter(250); // OpenAlex polite pool allows ~10 req/s, 250ms is very safe
const semanticScholarLimiter = new DomainRateLimiter(1100); // S2 unauthenticated rate limit is ~1 req/s
const defaultLimiter = new DomainRateLimiter(300);

export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retries = 3,
  backoffMs = 1500
): Promise<T | null> {
  const isS2 = url.includes("semanticscholar.org");
  const isOpenAlex = url.includes("openalex.org");
  const limiter = isS2 ? semanticScholarLimiter : isOpenAlex ? openAlexLimiter : defaultLimiter;

  return limiter.enqueue(async () => {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429 || response.status === 503) {
          const retryAfterHeader = response.headers.get("retry-after");
          const retrySeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 0;
          if (retrySeconds > 15) {
            console.warn(`[RateLimiter] Rate limit budget exhausted (${retrySeconds}s cooldown). Skipping API call for ${url}`);
            return null;
          }

          attempt++;
          if (attempt > retries) {
            console.warn(`[RateLimiter] Max retries exceeded for ${url} (status: ${response.status})`);
            return null;
          }
          const waitTime = retrySeconds > 0 ? retrySeconds * 1000 : backoffMs * Math.pow(2, attempt - 1);
          console.log(`[RateLimiter] Rate limited (HTTP ${response.status}) on ${url}. Backing off for ${waitTime}ms (Attempt ${attempt}/${retries})...`);
          await new Promise((r) => setTimeout(r, waitTime));
          continue;
        }

        if (response.status === 404) {
          return null;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
        }

        return (await response.json()) as T;
      } catch (err: unknown) {
        const error = err as { name?: string; message?: string };
        if (error.name === "AbortError") {
          console.warn(`[RateLimiter] Request timed out for ${url}`);
        }
        attempt++;
        if (attempt > retries) {
          throw err;
        }
        const waitTime = backoffMs * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, waitTime));
      }
    }
    return null;
  });
}
