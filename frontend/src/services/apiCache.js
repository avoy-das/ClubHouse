// Simple in-memory response cache with TTL and key invalidation support
const cacheMap = new Map();

/**
 * Fetch cached response or execute fetcher and store result if expired/missing.
 * @param {string} key Unique cache key
 * @param {number} ttlMs Time to live in milliseconds
 * @param {Function} fetcher Async function returning Axios response or data
 * @returns {Promise<any>}
 */
export async function getCached(key, ttlMs, fetcher) {
    const entry = cacheMap.get(key);
    const now = Date.now();

    if (entry && (now - entry.timestamp < ttlMs)) {
        return Promise.resolve(entry.data);
    }

    const response = await fetcher();
    cacheMap.set(key, {
        data: response,
        timestamp: now,
    });

    return response;
}

/**
 * Invalidate specific cache key or keys matching a wildcard prefix (e.g. 'clubs:*').
 * @param {string} keyOrPrefix 
 */
export function invalidateCache(keyOrPrefix) {
    if (!keyOrPrefix) return;

    if (keyOrPrefix.endsWith('*')) {
        const prefix = keyOrPrefix.slice(0, -1);
        for (const k of cacheMap.keys()) {
            if (k.startsWith(prefix)) {
                cacheMap.delete(k);
            }
        }
    } else {
        cacheMap.delete(keyOrPrefix);
    }
}

/**
 * Clear all stored API response caches.
 */
export function clearAllCache() {
    cacheMap.clear();
}
