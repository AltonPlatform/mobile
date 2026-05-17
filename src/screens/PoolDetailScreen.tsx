import React, {useCallback, useLayoutEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import axios from 'axios';

import {
  fetchPoolDetail,
  fetchPoolMe,
  postPoolBuy,
  postPoolSell,
} from '../api/pools';
import {formatApiError, getApiErrorCode} from '../api/errors';
import {newIdempotencyKey} from '../utils/idempotencyKey';
import {useUserContext} from '../context/UserContext';
import {Screen, MutedText} from '../components/ui';
import {PoolChartSection} from '../components/PoolChartSection';
import {PoolTradePanel} from '../components/PoolTradePanel';
import {colors, radii, space} from '../theme/tokens';
import {fontFamily} from '../theme/typography';
import type {PoolsStackParamList} from '../navigation/MainTabs';

export function PoolDetailScreen() {
  const {t} = useTranslation();
  const route = useRoute<RouteProp<PoolsStackParamList, 'PoolDetail'>>();
  const navigation =
    useNavigation<NativeStackNavigationProp<PoolsStackParamList>>();
  const {poolId} = route.params;
  const {token, refetchUser, userData} = useUserContext();
  const queryClient = useQueryClient();

  const [actionError, setActionError] = useState<string | null>(null);
  const [chartInterval, setChartInterval] = useState<'1h' | '1d'>('1h');
  const [chartNonce, setChartNonce] = useState(0);

  const userPoints =
    typeof userData?.points === 'number' && Number.isFinite(userData.points)
      ? userData.points
      : 0;

  const poolQuery = useQuery({
    queryKey: ['pool', poolId],
    queryFn: () => fetchPoolDetail(poolId),
  });

  const meQuery = useQuery({
    queryKey: ['poolMe', poolId],
    queryFn: () => fetchPoolMe(poolId),
    enabled: !!token,
    retry: false,
  });

  const pool = poolQuery.data;
  const me = meQuery.data;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: pool?.name ?? t('Pools'),
    });
  }, [navigation, pool?.name, t]);

  const invalidateAfterTrade = useCallback(async () => {
    await queryClient.invalidateQueries({queryKey: ['pool', poolId]});
    await queryClient.invalidateQueries({queryKey: ['poolMe', poolId]});
    await queryClient.invalidateQueries({queryKey: ['poolsSummary']});
    await queryClient.invalidateQueries({queryKey: ['pools', 'list']});
    setChartNonce(n => n + 1);
  }, [queryClient, poolId]);

  const buyMut = useMutation({
    mutationFn: async (vars: {pointsAmount: number; minTokensOut: string}) => {
      if (!Number.isFinite(vars.pointsAmount) || vars.pointsAmount <= 0) {
        throw new Error(t('farming_invalid_points'));
      }
      const idempotencyKey = newIdempotencyKey();
      return postPoolBuy(poolId, {
        pointsAmount: Math.floor(vars.pointsAmount),
        minTokensOut: vars.minTokensOut,
        idempotencyKey,
      });
    },
    onSuccess: async () => {
      setActionError(null);
      await invalidateAfterTrade();
      await refetchUser();
    },
    onError: (e: unknown) => {
      setActionError(formatApiError(e));
    },
  });

  const sellMut = useMutation({
    mutationFn: async (vars: {tokenAmount: string; minPointsOut: string}) => {
      const amt = vars.tokenAmount.trim();
      if (!amt) {
        throw new Error(t('farming_invalid_token_amount'));
      }
      const idempotencyKey = newIdempotencyKey();
      return postPoolSell(poolId, {
        tokenAmount: amt,
        minPointsOut: vars.minPointsOut,
        idempotencyKey,
      });
    },
    onSuccess: async () => {
      setActionError(null);
      await invalidateAfterTrade();
      await refetchUser();
    },
    onError: (e: unknown) => {
      setActionError(formatApiError(e));
    },
  });

  const volume24h = pool?.volume24hPoints;

  const busy = buyMut.isPending || sellMut.isPending;

  const positionBlock = useMemo(() => {
    if (!token) {
      return (
        <MutedText style={styles.hint}>{t('farming_login_to_trade')}</MutedText>
      );
    }
    if (meQuery.isPending) {
      return <ActivityIndicator color={colors.primary} />;
    }
    if (meQuery.isError) {
      const code = getApiErrorCode(meQuery.error);
      return (
        <Text style={styles.errorSmall}>
          {formatApiError(meQuery.error)}
          {code ? ` (${code})` : ''}
        </Text>
      );
    }
    if (!me) {
      return null;
    }
    return (
      <View style={styles.block}>
        <Text style={styles.sectionTitle}>{t('farming_your_position')}</Text>
        <Row label={t('farming_tokens')} value={me.amount} />
        <Row label={t('farming_stored_rewards')} value={me.storedRewards} />
        <Row label={t('farming_points_spent')} value={me.totalPointsSpent} />
        <MutedText style={styles.monoSmall}>
          lastRewardUpdate:{' '}
          {me.lastRewardUpdate
            ? String(me.lastRewardUpdate)
            : '—'}
        </MutedText>
      </View>
    );
  }, [me, meQuery.error, meQuery.isError, meQuery.isPending, token, t]);

  if (poolQuery.isPending) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (poolQuery.isError) {
    const status = axios.isAxiosError(poolQuery.error)
      ? poolQuery.error.response?.status
      : undefined;
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            {status === 404 ? t('farming_pool_not_found') : formatApiError(poolQuery.error)}
          </Text>
        </View>
      </Screen>
    );
  }

  if (!pool) {
    return null;
  }

  return (
    <Screen>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}>
        <View style={styles.block}>
          <Text style={styles.poolName}>{pool.name}</Text>
          {pool.description ? (
            <MutedText style={styles.desc}>{pool.description}</MutedText>
          ) : null}
          <Row label={t('farming_reserves_points')} value={pool.reservePoints} />
          <Row label={t('farming_reserves_tokens')} value={pool.reserveTokens} />
          <Row label={t('farming_total_held')} value={pool.totalUserHeldTokens} />
          <Row label={t('farming_max_supply')} value={pool.maxSupply} />
          <Row
            label={t('farming_emission_hour')}
            value={String(pool.emissionPerHour)}
          />
          <Row label={t('farming_spot')} value={pool.spotPriceApprox} />
          <Row
            label={t('farming_volume_24h')}
            value={volume24h ?? '—'}
          />
        </View>

        <View style={styles.block}>
          <Text style={styles.sectionTitle}>{t('farming_chart_title')}</Text>
          <View style={styles.chartTabs}>
            <TouchableOpacity
              style={[
                styles.chartTab,
                chartInterval === '1h' && styles.chartTabActive,
              ]}
              onPress={() => setChartInterval('1h')}
              activeOpacity={0.85}>
              <Text
                style={[
                  styles.chartTabText,
                  chartInterval === '1h' && styles.chartTabTextActive,
                ]}>
                {t('farming_chart_1h')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.chartTab,
                chartInterval === '1d' && styles.chartTabActive,
              ]}
              onPress={() => setChartInterval('1d')}
              activeOpacity={0.85}>
              <Text
                style={[
                  styles.chartTabText,
                  chartInterval === '1d' && styles.chartTabTextActive,
                ]}>
                {t('farming_chart_1d')}
              </Text>
            </TouchableOpacity>
          </View>
          <PoolChartSection
            key={`${poolId}-${chartInterval}-${chartNonce}`}
            poolId={poolId}
            interval={chartInterval}
            emptyLabel={t('farming_chart_empty')}
            swipeHint={t('farming_chart_swipe_hint')}
            currentSpotApprox={pool.spotPriceApprox}
            spotAsOf={
              typeof pool.updatedAt === 'string'
                ? pool.updatedAt
                : String(pool.updatedAt ?? '')
            }
          />
        </View>

        {positionBlock}

        {actionError ? (
          <Text style={styles.errorBanner}>{actionError}</Text>
        ) : null}

        {token ? (
          <PoolTradePanel
            key={`${pool.reservePoints}-${pool.reserveTokens}-${me?.amount ?? ''}-${userPoints}`}
            reservePoints={pool.reservePoints}
            reserveTokens={pool.reserveTokens}
            spotPriceApprox={pool.spotPriceApprox}
            userPoints={userPoints}
            positionTokens={me?.amount ?? '0'}
            busy={busy}
            onBuy={(pointsAmount, minTokensOut) =>
              buyMut.mutate({pointsAmount, minTokensOut})
            }
            onSell={(tokenAmount, minPointsOut) =>
              sellMut.mutate({tokenAmount, minPointsOut})
            }
          />
        ) : null}

        <TouchableLink
          label={t('farming_open_summary')}
          onPress={() => navigation.navigate('MyPoolsSummary')}
        />
      </ScrollView>
    </Screen>
  );
}

function Row({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable>
        {value}
      </Text>
    </View>
  );
}

function TouchableLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Text style={styles.link} onPress={onPress}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  scroll: {paddingBottom: space.xl},
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.lg,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
  },
  errorSmall: {
    color: colors.error,
    fontSize: 13,
    fontFamily: fontFamily.regular,
  },
  errorBanner: {
    color: colors.error,
    marginBottom: space.sm,
    fontFamily: fontFamily.regular,
  },
  block: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: space.md,
    marginBottom: space.md,
  },
  poolName: {
    fontSize: 20,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    marginBottom: space.xs,
  },
  desc: {marginBottom: space.sm},
  sectionTitle: {
    fontSize: 16,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    marginBottom: space.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: fontFamily.regular,
    flexShrink: 0,
  },
  rowValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontFamily: fontFamily.medium,
    flex: 1,
    textAlign: 'right',
  },
  hint: {marginVertical: space.sm},
  monoSmall: {marginTop: 8, fontSize: 11},
  link: {
    color: colors.primary,
    fontFamily: fontFamily.semibold,
    marginTop: space.sm,
    marginBottom: space.lg,
  },
  chartTabs: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.sm,
  },
  chartTab: {
    paddingVertical: 8,
    paddingHorizontal: space.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartTabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  chartTabText: {
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
    fontSize: 13,
  },
  chartTabTextActive: {
    color: colors.textPrimary,
  },
});
