/** Backend API (test environment). */
export const API_BASE_URL = 'https://testtwa.altons.trade';

/** Appodeal dashboard app key (rewarded only). Replace before release. */
export const APPODEAL_APP_KEY = 'YOUR_APPODEAL_APP_KEY';

/** TON Connect manifest URL — same host as production TWA.
 * Для возврата из кошелька в нативное приложение на хосте манифеста добавьте returnUrl
 * (см. TON_CONNECT_RETURN_URL в src/tonconnect/deeplink.ts и CFBundleURLTypes в iOS).
 */
export const TON_MANIFEST_URL =
  'https://twa.altons.trade/tonconnect-manifest.json';

/** Public TWA URL for referral links (matches mini app host). */
export const WEBAPP_URL = 'https://twa.altons.trade';
