import type {WalletInfoRemote} from '@tonconnect/sdk';

/** Офлайн-список (совпадает с FALLBACK в @tonconnect/sdk). */
export const FALLBACK_REMOTE_WALLETS: WalletInfoRemote[] = [
  {
    name: 'Tonkeeper',
    appName: 'tonkeeper',
    imageUrl: 'https://tonkeeper.com/assets/tonconnect-icon.png',
    tondns: 'tonkeeper.ton',
    aboutUrl: 'https://tonkeeper.com',
    universalLink: 'https://app.tonkeeper.com/ton-connect',
    deepLink: 'tonkeeper-tc://',
    bridgeUrl: 'https://bridge.tonapi.io/bridge',
    platforms: ['ios', 'android', 'chrome', 'firefox', 'macos'],
  },
  {
    name: 'MyTonWallet',
    appName: 'mytonwallet',
    imageUrl: 'https://static.mytonwallet.io/icon-256.png',
    aboutUrl: 'https://mytonwallet.io',
    universalLink: 'https://connect.mytonwallet.org',
    deepLink: 'mytonwallet-tc://',
    bridgeUrl: 'https://tonconnectbridge.mytonwallet.org/bridge/',
    platforms: ['ios', 'android', 'chrome', 'windows', 'macos', 'linux', 'firefox'],
  },
  {
    name: 'Wallet',
    appName: 'telegram-wallet',
    imageUrl: 'https://wallet.tg/images/logo-288.png',
    aboutUrl: 'https://wallet.tg/',
    universalLink: 'https://t.me/wallet?attach=wallet',
    bridgeUrl: 'https://walletbot.me/tonconnect-bridge/bridge',
    platforms: ['ios', 'android', 'macos', 'windows', 'linux'],
  },
];
