import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const GOATCOUNTER_ENDPOINT = 'https://sameraamar-hijri.goatcounter.com/count';
const GOATCOUNTER_SCRIPT = 'https://gc.zgo.at/count.js';
const PRODUCTION_HOST = 'sameraamar.github.io';

interface GoatCounterApi {
  no_onload?: boolean;
  count?: (options: { path: string }) => void;
}

declare global {
  interface Window {
    goatcounter?: GoatCounterApi;
  }
}

let loadPromise: Promise<GoatCounterApi | undefined> | undefined;

function loadGoatCounter(): Promise<GoatCounterApi | undefined> {
  if (!import.meta.env.PROD || window.location.hostname !== PRODUCTION_HOST) {
    return Promise.resolve(undefined);
  }

  if (window.goatcounter?.count) {
    return Promise.resolve(window.goatcounter);
  }

  if (loadPromise) return loadPromise;

  window.goatcounter = { ...window.goatcounter, no_onload: true };
  loadPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = GOATCOUNTER_SCRIPT;
    script.dataset.goatcounter = GOATCOUNTER_ENDPOINT;
    script.addEventListener('load', () => resolve(window.goatcounter), { once: true });
    script.addEventListener('error', () => resolve(undefined), { once: true });
    document.head.appendChild(script);
  });

  return loadPromise;
}

export default function GoatCounter() {
  const { pathname } = useLocation();

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      void loadGoatCounter().then((goatcounter) => {
        if (!cancelled) goatcounter?.count?.({ path: pathname });
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [pathname]);

  return null;
}