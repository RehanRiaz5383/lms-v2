import { useEffect } from 'react';
import { API_ENDPOINTS, getApiUrl } from '../config/api';

const STORAGE_KEY = 'lms_deploy_version';

/**
 * On each full page load, compare API deploy version with localStorage.
 * First visit: store server version, no reload.
 * Later visits: if server version changed (e.g. after deploy + app:bump-deploy-version), clear SW caches and hard-reload once.
 */
export default function DeployVersionSync() {
  useEffect(() => {
    let cancelled = false;

    async function sync() {
      try {
        const url = getApiUrl(API_ENDPOINTS.appVersion);
        const res = await fetch(url, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        if (!res.ok || cancelled) {
          return;
        }
        const body = await res.json();
        const serverVersion = body?.data?.version;
        if (serverVersion == null || cancelled) {
          return;
        }

        const serverStr = String(serverVersion);
        const stored = localStorage.getItem(STORAGE_KEY);

        if (stored === null) {
          localStorage.setItem(STORAGE_KEY, serverStr);
          return;
        }

        if (stored === serverStr) {
          return;
        }

        if ('caches' in window && typeof window.caches?.keys === 'function') {
          try {
            const names = await window.caches.keys();
            await Promise.all(names.map((name) => window.caches.delete(name)));
          } catch {
            /* ignore */
          }
        }

        localStorage.setItem(STORAGE_KEY, serverStr);
        window.location.reload();
      } catch {
        /* offline / CORS — do nothing */
      }
    }

    sync();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
