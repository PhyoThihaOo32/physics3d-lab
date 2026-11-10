import { useSyncExternalStore } from 'react';

export type Route =
  | { kind: 'directory' }
  | { kind: 'lab'; id: string }
  | { kind: 'experiment'; id: string }
  | { kind: 'not-found' };

export function parseRoute(path: string): Route {
  const normalized = path.replace(/\/+$/, '') || '/labs';
  if (normalized === '/labs') return { kind: 'directory' };
  const match = /^\/(labs|experiments)\/([a-z0-9-]+)$/.exec(normalized);
  if (!match) return { kind: 'not-found' };
  return { kind: match[1] === 'labs' ? 'lab' : 'experiment', id: match[2] };
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};
const getPath = () => window.location.hash.slice(1) || '/labs';

/** Hash routes support direct links, reloads, and browser history on static hosting. */
export function useRoute() {
  const path = useSyncExternalStore(subscribe, getPath, () => '/labs');
  return parseRoute(path);
}
