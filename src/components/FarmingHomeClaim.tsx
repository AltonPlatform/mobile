import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {fetchPoolsSummary, postPoolsClaim} from '../api/pools';
import {formatApiError, getApiErrorCode} from '../api/errors';
import {newIdempotencyKey} from '../utils/idempotencyKey';
import {useUserContext} from '../context/UserContext';
import {PrimaryButton, SecondaryButton} from '../components/ui';
import {colors, radii, space} from '../theme/tokens';
import {fontFamily} from '../theme/typography';
import type {HomeStackParamList} from '../navigation/MainTabs';

const CLAIM_COOLDOWN_MS = 6 * 60 * 60 * 1000;

function nextClaimAtFromSummary(lastFarmingClaimAt: string | null): string | null {
  if (!lastFarmingClaimAt) {
    return null;
  }
  const t0 = new Date(lastFarmingClaimAt).getTime();
  if (!Number.isFinite(t0)) {
    return null;
  }
  return new Date(t0 + CLAIM_COOLDOWN_MS).toISOString();
}

function formatCountdown(ms: number): string {
  if (ms <= 0) {
    return '0:00:00';
  }
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function FarmingHomeClaim() {
  const {t} = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const {token, refetchUser} = useUserContext();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  const [cooldownUntilIso, setCooldownUntilIso] = useState<string | null>(null);
  const [claimHint, setClaimHint] = useState<string | null>(null);

  const summaryQuery = useQuery({
    queryKey: ['poolsSummary'],
    queryFn: fetchPoolsSummary,
    enabled: !!token,
    retry: false,
  });

  const summary = summaryQuery.data;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!summary?.lastFarmingClaimAt || !cooldownUntilIso) {
      return;
    }
    const fromSummary = nextClaimAtFromSummary(summary.lastFarmingClaimAt);
    if (
      fromSummary &&
      Math.abs(new Date(fromSummary).getTime() - new Date(cooldownUntilIso).getTime()) <
        5000
    ) {
      setCooldownUntilIso(null);
    }
  }, [summary?.lastFarmingClaimAt, cooldownUntilIso]);

  const nextClaimIso = useMemo(() => {
    if (cooldownUntilIso) {
      return cooldownUntilIso;
    }
    return nextClaimAtFromSummary(summary?.lastFarmingClaimAt ?? null);
  }, [cooldownUntilIso, summary?.lastFarmingClaimAt]);

  const msUntilClaim = !nextClaimIso
    ? 0
    : new Date(nextClaimIso).getTime() - now;

  const onCooldown = msUntilClaim > 0;

  const claimMut = useMutation({
    mutationFn: async () => {
      const idempotencyKey = newIdempotencyKey();
      return postPoolsClaim({idempotencyKey});
    },
    onSuccess: async data => {
      setClaimHint(null);
      if (data.nextClaimAt) {
        setCooldownUntilIso(data.nextClaimAt);
      }
      await queryClient.invalidateQueries({queryKey: ['poolsSummary']});
      await queryClient.invalidateQueries({queryKey: ['poolMe']});
      await queryClient.invalidateQueries({queryKey: ['chartGameConfig']});
      await refetchUser();
    },
    onError: (e: unknown) => {
      const code = getApiErrorCode(e);
      setClaimHint(formatApiError(e));
      if (code === 'ClaimCooldown' && summary?.lastFarmingClaimAt) {
        setCooldownUntilIso(nextClaimAtFromSummary(summary.lastFarmingClaimAt));
      }
    },
  });

  const goPools = useCallback(() => {
    navigation.getParent()?.navigate('Pools', {screen: 'PoolsList'});
  }, [navigation]);

  if (!token) {
    return (
      <View style={styles.box}>
        <Text style={styles.muted}>{t('farming_home_login_hint')}</Text>
        <SecondaryButton title={t('farming_go_pools')} onPress={goPools} />
      </View>
    );
  }

  if (summaryQuery.isPending) {
    return (
      <View style={styles.box}>
        <Text style={styles.muted}>{t('farming_loading_summary')}</Text>
      </View>
    );
  }

  if (summaryQuery.isError) {
    return (
      <View style={styles.box}>
        <Text style={styles.err}>{formatApiError(summaryQuery.error)}</Text>
        <SecondaryButton
          title={t('Retry')}
          onPress={() => summaryQuery.refetch()}
        />
      </View>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <View style={styles.box}>
      <Text style={styles.label}>{t('farming_stored_unclaimed')}</Text>
      <Text style={styles.big} selectable>
        {summary.totalUnclaimedStoredRewards}
      </Text>
      <Text style={styles.label}>{t('farming_profit_estimate')}</Text>
      <Text style={styles.value} selectable>
        {summary.totalFarmingProfitEstimate}
      </Text>
      {onCooldown ? (
        <Text style={styles.cooldown}>
          {t('farming_claim_available_in', {
            time: formatCountdown(msUntilClaim),
          })}
        </Text>
      ) : (
        <Text style={styles.ready}>{t('farming_claim_ready')}</Text>
      )}
      {claimHint ? <Text style={styles.hint}>{claimHint}</Text> : null}
      <PrimaryButton
        title={t('farming_claim_all')}
        loading={claimMut.isPending}
        onPress={() => {
          setClaimHint(null);
          claimMut.mutate();
        }}
        disabled={claimMut.isPending}
        style={styles.btn}
      />
      <SecondaryButton title={t('farming_go_pools')} onPress={goPools} />
      <SecondaryButton
        title={t('mining_click_play')}
        onPress={() => navigation.navigate('MiningClick')}
        style={styles.btnPlay}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: space.md,
    width: '100%',
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fontFamily.regular,
    marginTop: 6,
  },
  big: {
    color: colors.textPrimary,
    fontSize: 20,
    fontFamily: fontFamily.bold,
    marginTop: 4,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fontFamily.semibold,
    marginTop: 4,
  },
  muted: {
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
  },
  err: {
    color: colors.error,
    fontFamily: fontFamily.regular,
    marginBottom: space.sm,
    textAlign: 'center',
  },
  cooldown: {
    marginTop: space.sm,
    color: colors.primary,
    fontFamily: fontFamily.semibold,
  },
  ready: {
    marginTop: space.sm,
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
  },
  hint: {
    marginTop: space.sm,
    color: colors.error,
    fontSize: 13,
    fontFamily: fontFamily.regular,
  },
  btn: {marginTop: space.md, marginBottom: space.sm},
  btnPlay: {marginTop: space.sm},
});
