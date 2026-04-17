export const getApiBase = (): string => {
  const protocol = typeof window !== 'undefined' ? window.location.protocol || '' : '';
  const host = typeof window !== 'undefined' ? window.location.hostname || '' : '';
  const isDev = Boolean((import.meta as any)?.env?.DEV);
  const envBaseRaw = (import.meta as any)?.env?.VITE_API_BASE;
  const envBase = typeof envBaseRaw === 'string' ? envBaseRaw.trim() : '';
  const isLocalHost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.local');

  const normalizeBase = (base: string): string => {
    const trimmed = base.trim();
    if (!trimmed) return '';

    let normalized = trimmed.replace(/\/+$/, '');
    if (
      !/^https?:\/\//i.test(normalized) &&
      !normalized.startsWith('/') &&
      !normalized.startsWith('.')
    ) {
      const scheme = /localhost|127\.0\.0\.1|::1/i.test(normalized)
        ? 'http://'
        : 'https://';
      normalized = `${scheme}${normalized}`;
    }

    // Serviços já prefixam com /api/...; evita duplicar quando VITE_API_BASE vier com /api.
    normalized = normalized.replace(/\/api$/i, '');
    return normalized;
  };

  // Force the production API when served from GitHub Pages to avoid hitting the static host
  if (host.endsWith('github.io')) {
    return 'https://adsvendas.adsapi.com.br';
  }

  // Ambiente adsapi (com ou sem porta): usar same-origin e encaminhar /api no proxy.
  if (!isLocalHost && host.endsWith('adsapi.com.br')) {
    return '';
  }

  // Prefer build-time Vite env when it is present and non-empty
  if (envBase) {
    const normalizedEnvBase = normalizeBase(envBase);
    const pointsToLocalApi = /^https?:\/\/(localhost|127\.0\.0\.1|::1)(:\d+)?/i.test(
      normalizedEnvBase,
    );
    if (!isLocalHost && pointsToLocalApi) {
      return '';
    }
    return normalizedEnvBase;
  }

  // Local default
  if (isLocalHost || isDev || protocol === 'file:') return 'http://localhost:3000';

  // Produção sem env explícita: same-origin
  return '';
};

export const API_BASE = getApiBase();
