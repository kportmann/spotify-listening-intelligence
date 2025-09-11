### Services overview

The `services/` layer encapsulates all HTTP calls and provides a small, consistent API to the rest of the app. Services are framework-agnostic (no React imports) and return plain data.

### HTTP client

Files:
- `http/client.js`: thin wrapper around `fetch` with base URL, query params, JSON handling, optional caching, and abort support
- `http/errors.js`: normalizes errors to a single `ApiError` shape
- `http/cache.js`: tiny in-memory TTL cache for GET requests

Base URL:
- Uses `process.env.REACT_APP_API_BASE_URL` when set, otherwise defaults to `http://localhost:8000/api/v1`

API:
```javascript
import { http } from './http/client';

// GET with query params, caching, and abort
http.get('/path', {
  params: { q: 'hello' },
  cacheTtlMs: 60000,     // optional
  bypassCache: false,    // optional (true forces fresh fetch)
  signal,                // optional AbortController.signal
});

// POST/PUT/DELETE with JSON body
http.post('/path', { body: { a: 1 } });
```

Errors:
- All non-2xx responses throw an `ApiError` with `{ status, code, message, details }`
- Hooks catch and surface this in their `error` field for consistent UI handling

Caching:
- Simple per-request cache keyed by method+URL+body
- Expires after `cacheTtlMs`
- `bypassCache: true` skips cache (useful for manual refresh)

### Service conventions
- Keep services stateless and pure (no React, no component state)
- Return parsed JSON payloads without view formatting
- Accept primitives and plain objects; avoid passing React-specific values
- Group by domain: `musicService`, `podcastService`, `basicStatsService`, `listeningPatternsService`

### Example (musicService)
```javascript
import { http } from './http/client';

export const musicService = {
  getTopArtists(period = 'all_time', limit = 10, includeImages = false, refreshCache = false) {
    return http.get('/music/top/artists', {
      params: { period, limit, include_images: includeImages, refresh_cache: refreshCache },
      cacheTtlMs: 60000,
      bypassCache: refreshCache,
    });
  },

  getImagesBatch({ artists = null, tracks = null } = {}) {
    return http.post('/music/images/batch', { body: { artists, tracks } });
  },
};
```

### Environment
- Dev: default base URL works with backend on `http://localhost:8000/api/v1`
- Staging/Prod: set `REACT_APP_API_BASE_URL` to your API origin

### Testing
- Unit test services by mocking `fetch` or the exported `http` methods
- Hooks should be tested separately, mocking services as needed

### Future enhancements
- Auth headers/interceptors
- Retries/backoff for transient failures
- Request/response logging in development
- Persistent caching layer if needed
