export const getApiBase = (): string => {
  const protocol = typeof window !== 'undefined' ? window.location.protocol || '' : '';
  const host = typeof window !== 'undefined' ? window.location.hostname || '' : '';
  const envBaseRaw = (import.meta as any)?.env?.VITE_API_BASE;
  const envBase = typeof envBaseRaw === 'string' ? envBaseRaw.trim() : '';

  // Force the production API when served from GitHub Pages to avoid hitting the static host
  if (host.endsWith('github.io')) {
    return 'https://adsvendas.adsapi.com.br';
  }

  // Prefer build-time Vite env when it is present and non-empty
  if (envBase) {
    return envBase;
  }

  // Homologação/produção em HTTPS
  if (protocol === 'https:' && host.endsWith('adsvendas-f.adsapi.com.br')) {
    return 'https://adsvendas-b.adsapi.com.br';
  }

  // Local default
  return 'http://localhost:3000';
};

export const API_BASE = getApiBase();
