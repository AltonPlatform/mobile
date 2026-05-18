/** Backend API (test environment). */
export const API_BASE_URL = 'https://testtwa.altons.trade';

/** CAS.AI manager ID. Use `demo` for test ads; replace before release. */
export const CAS_ID = 'demo';

/** TON Connect manifest URL — same host as production TWA.
 * Для возврата из кошелька в нативное приложение на хосте манифеста добавьте returnUrl
 * (см. TON_CONNECT_RETURN_URL в src/tonconnect/deeplink.ts и CFBundleURLTypes в iOS).
 */
export const TON_MANIFEST_URL =
  'https://twa.altons.trade/tonconnect-manifest.json';

/**
 * Список кошельков Ton Connect (вместо config.ton.org — часто таймаутит в RN).
 * При желании можно заменить на `https://twa.altons.trade/wallets-v2.json` (статик, не SPA).
 */
export const TON_WALLETS_LIST_URL =
  'https://cdn.jsdelivr.net/gh/ton-connect/wallets-list@main/wallets-v2.json';

/** Public TWA URL for referral links (matches mini app host). */
export const WEBAPP_URL = 'https://twa.altons.trade';
