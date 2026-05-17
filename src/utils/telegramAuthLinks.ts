import {Linking} from 'react-native';

/** Deep link: OAuth callback back into the native app (register in BotFather Allowed URLs). */
export const TELEGRAM_AUTH_CALLBACK_URL = 'alton://auth/callback';

const TELEGRAM_PROBE_URL = 'tg://';

/** Whether the OS can hand off to the Telegram app (false on simulator without Telegram). */
export async function canOpenTelegramApp(): Promise<boolean> {
  try {
    return await Linking.canOpenURL(TELEGRAM_PROBE_URL);
  } catch {
    return false;
  }
}

export function isTelegramAppLink(url: string): boolean {
  const u = url.trim().toLowerCase();
  return u.startsWith('tg://') || u.startsWith('telegram://');
}

export function isTelegramOAuthCallbackUrl(
  url: string,
  redirectUri: string,
): boolean {
  try {
    const nav = new URL(url);
    const tmpl = new URL(redirectUri);
    const norm = (p: string) => (p.endsWith('/') ? p.slice(0, -1) : p) || '/';
    return (
      nav.origin === tmpl.origin &&
      norm(nav.pathname) === norm(tmpl.pathname)
    );
  } catch {
    return url.startsWith(redirectUri);
  }
}

export function isNativeTelegramAuthCallback(url: string): boolean {
  try {
    const nav = new URL(url);
    const tmpl = new URL(TELEGRAM_AUTH_CALLBACK_URL);
    const norm = (p: string) => (p.endsWith('/') ? p.slice(0, -1) : p) || '/';
    return (
      nav.protocol === tmpl.protocol &&
      nav.hostname === tmpl.hostname &&
      norm(nav.pathname) === norm(tmpl.pathname)
    );
  } catch {
    return url.startsWith(TELEGRAM_AUTH_CALLBACK_URL);
  }
}

export function extractOAuthCode(url: string): string | null {
  try {
    return new URL(url).searchParams.get('code');
  } catch {
    return null;
  }
}
