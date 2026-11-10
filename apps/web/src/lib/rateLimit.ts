interface RateLimitBucket {
  timestamps: number[];
}

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 5000;

/**
 * Extrae el identificador de IP del cliente desde cabeceras de proxy o fallback local.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip');
  return realIp ? realIp.trim() : '127.0.0.1';
}

/**
 * Limitador de tasa de ventana deslizante en memoria con poda automática.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Poda defensiva si el mapa crece demasiado
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets.entries()) {
      const valid = b.timestamps.filter((t) => t > windowStart);
      if (valid.length === 0) {
        buckets.delete(k);
      } else {
        b.timestamps = valid;
      }
    }
  }

  const bucket = buckets.get(key) || { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => t > windowStart);

  if (bucket.timestamps.length >= maxRequests) {
    const oldestInWindow = bucket.timestamps[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));
    buckets.set(key, bucket);
    return { allowed: false, retryAfterSec };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { allowed: true, retryAfterSec: 0 };
}

