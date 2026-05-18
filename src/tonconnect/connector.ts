import {TonConnect} from '@tonconnect/sdk';

import {TON_MANIFEST_URL, TON_WALLETS_LIST_URL} from '../config';
import {createTonConnectAsyncStorage} from './storage';

const storage = createTonConnectAsyncStorage();

/**
 * Единственный инстанс TonConnect для приложения.
 * disableAutoPauseConnection: без этого Hermes при уходе в фон «засыпает» SSE и рукопожатие с мостом рвётся.
 *
 * Открытие universal link делается вручную через Linking после connect() (см. utils/openWalletLink).
 */
let connector: TonConnect | null = null;

export function getTonConnector(): TonConnect {
  if (!connector) {
    connector = new TonConnect({
      manifestUrl: TON_MANIFEST_URL,
      storage: storage as never,
      disableAutoPauseConnection: true as never,
      analytics: {mode: 'off'} as never,
      walletsListSource: TON_WALLETS_LIST_URL,
      walletsListCacheTTLMs: 24 * 60 * 60 * 1000,
    });
  }
  return connector;
}
