### Hooks overview

This folder contains React hooks used across the frontend. Hooks follow consistent patterns to keep components simple and the data layer predictable.

### Core pattern: useApi

- Fetching logic is centralized in `hooks/common/useApi.js`.
- Responsibilities:
  - Runs an async fetch function you provide
  - Manages `loading`, `error`, and abort safety (via AbortController)
  - Keeps previously loaded data while re-fetching (tracks `refreshing` internally)
  - Exposes a `refetch()` callback

Signature:
```javascript
const { data, loading, refreshing, error, refetch } = useApi(
  fetchFn,                 // () => Promise<any>
  { params = [], enabled = true } // dependencies and gate
);
```

Guidelines:
- Put API calling code in `services/` (e.g., `musicService`), not inside components.
- Hooks call services and return domain-shaped data.
- Derive UI-specific values inside components with `useMemo`.

### Public hook conventions

- Inputs: positional args for common cases; consider an `options` object for extensibility
  - Example: `useTopArtists(period, limit, includeImages, refreshCache)`
- Return shape:
  - Data: domain-named (`artists`, `tracks`, `episodes`, etc.) or `data` object when multiple payloads
  - Status: `{ loading, refreshing, error }`
  - Controls: `{ refetch }`

### Examples

Fetch combined top content:
```javascript
import { useTopContent } from '../hooks';

const { data, loading, refreshing, error, refetch } = useTopContent('all_time', 5);
// data: { artists, tracks, episodes, shows, audiobooks }
// use `refreshing` to avoid flicker while reloading; call `refetch()` for manual refresh
```

Fetch top artists with images:
```javascript
import { useTopArtists } from '../hooks';

const { artists, loading, refreshing, error, refetch } = useTopArtists('all_time', 10, true);
```

Use `useApi` directly for custom hooks:
```javascript
import { useApi } from './common/useApi';
import { musicService } from '../services/musicService';

export function useArtistImages(artistNames) {
  return useApi(
    () => musicService.getImagesBatch({ artists: artistNames }),
    { params: [JSON.stringify(artistNames)] }
  );
}
```

### Error handling

- Services throw normalized errors via the shared HTTP client (`services/http`).
- Hooks capture errors and surface them in the `error` field; components render friendly messages.

### Refresh behavior

- `useApi` keeps prior `data` and tracks `refreshing` to avoid UI flicker.
- Public hooks expose `{ refreshing, refetch }` for smooth reloading and manual refresh.

### Adding a new data hook (checklist)

1) Add a method in the relevant `service` (no React imports inside services)
2) Create a hook that calls the service using `useApi`
3) Return domain-shaped data with `{ loading, refreshing, error, refetch }`
4) Derive any view-specific formatting inside the component (not in the hook)

### Related

- HTTP utilities: `src/services/http/{client.js, errors.js, cache.js}`
- Existing hooks using this pattern:
  - `useTopContent.js`, `useAnalytics.js`, `useFirstPlay.js`
