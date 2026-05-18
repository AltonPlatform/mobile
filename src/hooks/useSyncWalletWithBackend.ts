import {useEffect, useRef} from 'react';
import {useMutation} from '@tanstack/react-query';
import {Alert} from 'react-native';
import axios from 'axios';
import {useTranslation} from 'react-i18next';

import {api} from '../api/client';
import {formatApiError} from '../api/errors';
import type {TonWalletAccount} from '../tonconnect/utils/account';

export function isWalletAddressInUseError(err: unknown): boolean {
  if (!axios.isAxiosError(err) || err.response?.status !== 400) {
    return false;
  }
  const msg = String(
    (err.response?.data as {message?: string} | undefined)?.message ?? '',
  );
  return msg.toLowerCase().includes('already in use');
}

type UserWallet = {
  address?: string;
  publicKey?: string;
} | null | undefined;

type Options = {
  walletAccount: TonWalletAccount | null;
  userWallet: UserWallet;
  refetchUser: () => Promise<unknown>;
  disconnect: () => Promise<void>;
  /** Показать Alert после успешного сохранения (экран Wallet). */
  showSuccessAlert?: boolean;
};

/**
 * Синхронизирует TonConnect → POST /api/users/wallet.
 * При «address already in use» отключает кошелёк и не повторяет запрос (без рекурсии Alert/API).
 */
export function useSyncWalletWithBackend({
  walletAccount,
  userWallet,
  refetchUser,
  disconnect,
  showSuccessAlert = false,
}: Options) {
  const {t} = useTranslation();
  const blockedAddressRef = useRef<string | null>(null);
  const syncStoppedRef = useRef(false);

  const saveMut = useMutation({
    mutationFn: async (payload: {address: string; publicKey: string}) => {
      await api.post('/api/users/wallet', payload);
    },
    onSuccess: async () => {
      syncStoppedRef.current = false;
      blockedAddressRef.current = null;
      await refetchUser();
      if (showSuccessAlert) {
        Alert.alert(
          t('OK', {defaultValue: 'OK'}),
          t('Wallet saved', {defaultValue: 'Wallet saved'}),
        );
      }
    },
    onError: async (err, variables) => {
      if (isWalletAddressInUseError(err)) {
        blockedAddressRef.current = variables.address;
        syncStoppedRef.current = true;
        await disconnect().catch(() => undefined);
        Alert.alert(
          t('Error'),
          t('The wallet address is already in use by another user.', {
            defaultValue: 'Wallet address is already in use by another user',
          }),
        );
        return;
      }
      syncStoppedRef.current = true;
      Alert.alert(
        t('Error'),
        formatApiError(err) ||
          t('Could not save wallet', {defaultValue: 'Could not save wallet'}),
      );
    },
  });

  const address = walletAccount?.address ?? '';
  const publicKey = walletAccount?.publicKey ?? '';

  useEffect(() => {
    if (!address) {
      syncStoppedRef.current = false;
      blockedAddressRef.current = null;
      return;
    }
    if (address !== blockedAddressRef.current) {
      syncStoppedRef.current = false;
    }
  }, [address]);

  useEffect(() => {
    if (!address || saveMut.isPending || syncStoppedRef.current) {
      return;
    }
    if (blockedAddressRef.current === address) {
      return;
    }

    const currentAddress =
      typeof userWallet?.address === 'string' ? userWallet.address : '';
    const currentKey =
      typeof userWallet?.publicKey === 'string' ? userWallet.publicKey : '';
    if (address === currentAddress && publicKey === currentKey) {
      syncStoppedRef.current = false;
      blockedAddressRef.current = null;
      return;
    }

    saveMut.mutate({address, publicKey});
  }, [
    address,
    publicKey,
    userWallet?.address,
    userWallet?.publicKey,
    saveMut.isPending,
  ]);

  return {isSavingWallet: saveMut.isPending};
}
