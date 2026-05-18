import React, {useCallback, useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {fetchPoolsSummary, postPoolsClaim} from '../api/pools';
import {formatApiError, getApiErrorCode} from '../api/errors';
import {newIdempotencyKey} from '../utils/idempotencyKey';
import {useUserContext} from '../context/UserContext';
import {Screen, PrimaryButton, MutedText} from '../components/ui';
import {colors, radii, space} from '../theme/tokens';
import {fontFamily} from '../theme/typography';
import type {PoolsByPoolRow} from '../types/pools';
import type {PoolsStackParamList} from '../navigation/MainTabs';
import {formatPoolBigInt} from '../utils/poolFormat';
import {
  formatFarmingCountdown,
  nextClaimAtFromSummary,
  resolveTotalRewardPerHour,
} from '../utils/poolFarmingCycle';

export function PoolsSummaryScreen() {
  const {t} = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<PoolsStackParamList>>();
  const {refetchUser} = useUserContext();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => Date.now());

  const [cooldownUntilIso, setCooldownUntilIso] = useState<string | null>(null);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  const summaryQuery = useQuery({
    queryKey: ['poolsSummary'],
    queryFn: fetchPoolsSummary,
    retry: false,
  });

  const summary = summaryQuery.data;

  useLayoutEffect(() => {
    navigation.setOptions({title: t('farming_my_pools')});
  }, [navigation, t]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const nextClaimIso = useMemo(() => {
    if (cooldownUntilIso) {
      return cooldownUntilIso;
    }
    return nextClaimAtFromSummary(summary?.lastFarmingClaimAt ?? null);
  }, [cooldownUntilIso, summary?.lastFarmingClaimAt]);

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
      setClaimMessage(null);
      if (data.nextClaimAt) {
        setCooldownUntilIso(data.nextClaimAt);
      }
      await queryClient.invalidateQueries({queryKey: ['poolsSummary']});
      await queryClient.invalidateQueries({queryKey: ['poolMe']});
      await refetchUser();
    },
    onError: (e: unknown) => {
      const code = getApiErrorCode(e);
      setClaimMessage(formatApiError(e));
      if (code === 'ClaimCooldown' && summary?.lastFarmingClaimAt) {
        setCooldownUntilIso(
          nextClaimAtFromSummary(summary.lastFarmingClaimAt),
        );
      }
    },
  });

  const onRefresh = useCallback(() => {
    summaryQuery.refetch().catch(() => {});
  }, [summaryQuery]);

  if (summaryQuery.isPending) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (summaryQuery.isError) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            {formatApiError(summaryQuery.error)}
          </Text>
          <PrimaryButton title={t('Retry', {defaultValue: 'Retry'})} onPress={onRefresh} />
        </View>
      </Screen>
    );
  }

  if (!summary) {
    return null;
  }

  const renderRow = ({item}: {item: PoolsByPoolRow}) => (
    <View style={styles.rowCard}>
      <Text style={styles.rowTitle} numberOfLines={1}>
        {item.poolName ?? item.poolId}
      </Text>
      <MutedText selectable numberOfLines={1}>
        id: {item.poolId}
      </MutedText>
      <View style={styles.rowLine}>
        <Text style={styles.rowLbl}>{t('farming_tokens')}</Text>
        <Text style={styles.rowVal} selectable>
          {item.amount}
        </Text>
      </View>
      <View style={styles.rowLine}>
        <Text style={styles.rowLbl}>{t('farming_stored_rewards')}</Text>
        <Text style={styles.rowVal} selectable>
          {item.storedRewards}
        </Text>
      </View>
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={summary.byPool}
        keyExtractor={r => r.poolId}
        renderItem={renderRow}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.title}>{t('farming_my_pools')}</Text>
            <Row label={t('farming_total_unclaimed')} value={summary.totalUnclaimedStoredRewards} />
            <Row label={t('farming_total_claimed')} value={summary.totalFarmingRewardsClaimed} />
            <Row
              label={t('farming_profit_estimate')}
              value={summary.totalFarmingProfitEstimate}
            />
            <Row
              label={t('Profit Per Hour')}
              value={formatPoolBigInt(resolveTotalRewardPerHour(summary))}
            />
            <MutedText style={styles.lastClaim}>
              lastFarmingClaimAt:{' '}
              {summary.lastFarmingClaimAt
                ? String(summary.lastFarmingClaimAt)
                : '—'}
            </MutedText>
            {onCooldown ? (
              <Text style={styles.cooldown}>
                {t('farming_claim_available_in', {
                  time: formatFarmingCountdown(msUntilClaim),
                })}
              </Text>
            ) : (
              <MutedText>{t('farming_claim_ready')}</MutedText>
            )}
            {claimMessage ? (
              <Text style={styles.claimMsg}>{claimMessage}</Text>
            ) : null}
            <PrimaryButton
              style={styles.claimBtn}
              title={t('farming_claim_all')}
              loading={claimMut.isPending}
              onPress={() => {
                setClaimMessage(null);
                claimMut.mutate();
              }}
              disabled={claimMut.isPending}
            />
          </View>
        }
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={summaryQuery.isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>{t('farming_no_positions')}</Text>
        }
      />
    </Screen>
  );
}

function Row({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.kv}>
      <Text style={styles.kvLabel}>{label}</Text>
      <Text style={styles.kvVal} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.lg,
    gap: space.md,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    marginBottom: space.sm,
  },
  list: {paddingBottom: space.xl},
  headerBlock: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: space.md,
    marginBottom: space.md,
  },
  title: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: space.sm,
  },
  kv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 6,
  },
  kvLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: fontFamily.regular,
  },
  kvVal: {
    color: colors.textPrimary,
    fontSize: 13,
    fontFamily: fontFamily.medium,
    flex: 1,
    textAlign: 'right',
  },
  lastClaim: {marginTop: space.sm, fontSize: 11},
  cooldown: {
    marginTop: space.sm,
    color: colors.primary,
    fontFamily: fontFamily.semibold,
  },
  claimMsg: {
    marginTop: space.sm,
    color: colors.error,
    fontFamily: fontFamily.regular,
  },
  claimBtn: {marginTop: space.md},
  rowCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: space.md,
    marginBottom: space.sm,
  },
  rowTitle: {
    fontSize: 15,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  rowLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  rowLbl: {color: colors.textMuted, fontSize: 12, fontFamily: fontFamily.regular},
  rowVal: {color: colors.textPrimary, fontSize: 12, fontFamily: fontFamily.medium},
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: space.lg,
    fontFamily: fontFamily.regular,
  },
});
