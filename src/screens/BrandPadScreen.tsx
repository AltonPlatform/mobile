import React, {useCallback, useLayoutEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
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
  fetchActiveBrandPad,
  fetchBrandPad,
  fetchBrandPadMe,
  postBrandPadContribute,
} from '../api/brandpad';
import {fetchPoolDetail} from '../api/pools';
import {formatApiError} from '../api/errors';
import {BrandPadContributePanel} from '../components/BrandPadContributePanel';
import {BrandPadCountdown} from '../components/BrandPadCountdown';
import {BrandPadLeaderboard} from '../components/BrandPadLeaderboard';
import {BrandPadProgressBar} from '../components/BrandPadProgressBar';
import {BrandPadStatusBanner} from '../components/BrandPadStatusBanner';
import {BrandPadTokenomics} from '../components/BrandPadTokenomics';
import {BalanceCoinIcon} from '../components/Icons';
import {Screen, MutedText, SectionTitle} from '../components/ui';
import {useUserContext} from '../context/UserContext';
import type {HomeStackParamList} from '../navigation/MainTabs';
import {colors, radii, space} from '../theme/tokens';
import {fontFamily} from '../theme/typography';
import {newIdempotencyKey} from '../utils/idempotencyKey';
import {
  formatMultiplier,
  parseBrandpadBigInt,
  previewAllocation,
} from '../utils/brandpadAllocation';
import {brandpadIconUrl} from '../utils/brandpadDicebear';
import {
  defaultBrandpadDescription,
  generateBrandpadName,
} from '../utils/brandpadNames';
import {localeFormat, sumFormat} from '../utils/formatNumbers';

export function BrandPadScreen() {
  const {t} = useTranslation();
  const route = useRoute<RouteProp<HomeStackParamList, 'BrandPad'>>();
  const navigation =
    useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const parentNav = navigation.getParent();
  const {token, refetchUser, userData} = useUserContext();
  const queryClient = useQueryClient();

  const paramId = route.params?.brandpadId;

  const [contributeOpen, setContributeOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeQuery = useQuery({
    queryKey: ['brandpad', 'active'],
    queryFn: fetchActiveBrandPad,
    enabled: !paramId,
    staleTime: 30_000,
  });

  const resolvedId = paramId ?? activeQuery.data?.id ?? null;

  const padQuery = useQuery({
    queryKey: ['brandpad', resolvedId],
    queryFn: () => fetchBrandPad(resolvedId!),
    enabled: !!resolvedId,
  });

  const meQuery = useQuery({
    queryKey: ['brandpad', resolvedId, 'me'],
    queryFn: () => fetchBrandPadMe(resolvedId!),
    enabled: !!resolvedId && !!token,
    retry: false,
  });

  const pad = padQuery.data;

  const launchedPoolQuery = useQuery({
    queryKey: ['pool', pad?.poolId],
    queryFn: () => fetchPoolDetail(pad!.poolId!),
    enabled: Boolean(pad?.poolId && pad.status === 'succeeded'),
  });
  const me = meQuery.data;

  const userBalance =
    typeof userData?.balance === 'number' && Number.isFinite(userData.balance)
      ? userData.balance
      : 0;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: pad?.name ?? t('brandpad_title'),
      headerStyle: {backgroundColor: colors.surface},
      headerTintColor: colors.textPrimary,
      headerTitleStyle: {fontFamily: fontFamily.semibold},
    });
  }, [navigation, pad?.name, t]);

  const contributeMut = useMutation({
    mutationFn: async (amount: number) => {
      if (!resolvedId) {
        throw new Error(t('brandpad_not_found'));
      }
      return postBrandPadContribute(resolvedId, {
        amount,
        idempotencyKey: newIdempotencyKey(),
      });
    },
    onSuccess: async () => {
      setActionError(null);
      setContributeOpen(false);
      await queryClient.invalidateQueries({queryKey: ['brandpad', resolvedId]});
      await queryClient.invalidateQueries({
        queryKey: ['brandpad', resolvedId, 'leaderboard'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['brandpad', resolvedId, 'me'],
      });
      await queryClient.invalidateQueries({queryKey: ['brandpad', 'active']});
      await refetchUser();
    },
    onError: (e: unknown) => {
      setActionError(formatApiError(e));
    },
  });

  const goToPool = useCallback(() => {
    if (!pad?.poolId) {
      return;
    }
    parentNav?.navigate('Pools', {
      screen: 'PoolDetail',
      params: {poolId: pad.poolId},
    });
  }, [pad?.poolId, parentNav]);

  const iconUrl = useMemo(
    () => (pad ? pad.icon || brandpadIconUrl(pad.id, 128) : ''),
    [pad],
  );

  const displayName = pad?.name ?? (pad ? generateBrandpadName(pad.id) : '');
  const description =
    pad?.description?.trim() || defaultBrandpadDescription();

  const isActive = pad?.status === 'active';

  const myPreview = useMemo(() => {
    if (!pad || !me) {
      return null;
    }
    const contrib = parseBrandpadBigInt(me.contributed);
    const total = parseBrandpadBigInt(pad.totalContributed);
    if (contrib <= 0n) {
      return null;
    }
    return previewAllocation({
      userContributed: contrib,
      totalContributed: total,
      brandpadAllocation: parseBrandpadBigInt(pad.brandpadAllocation, '2000000'),
      rank: me.rank > 0 ? me.rank : undefined,
    });
  }, [pad, me]);

  if (!paramId && activeQuery.isPending) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!resolvedId && activeQuery.isSuccess && !activeQuery.data) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>{t('brandpad_no_active')}</Text>
          <MutedText>{t('brandpad_no_active_hint')}</MutedText>
        </View>
      </Screen>
    );
  }

  if (padQuery.isPending) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (padQuery.isError) {
    const status = axios.isAxiosError(padQuery.error)
      ? padQuery.error.response?.status
      : undefined;
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            {status === 404
              ? t('brandpad_not_found')
              : formatApiError(padQuery.error)}
          </Text>
        </View>
      </Screen>
    );
  }

  if (!pad) {
    return null;
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={{uri: iconUrl}} style={styles.avatar} />
          <Text style={styles.name}>{displayName}</Text>
          <MutedText style={styles.desc}>{description}</MutedText>
        </View>

        <BrandPadStatusBanner
          status={pad.status}
          participantCount={pad.participantCount}
          minParticipants={pad.minParticipants}
          totalContributed={pad.totalContributed}
          minTotalContributed={pad.minTotalContributed}
          onGoToPool={pad.poolId ? goToPool : undefined}
        />

        <View style={styles.block}>
          <BrandPadProgressBar
            totalContributed={pad.totalContributed}
            goalContributed={pad.minTotalContributed}
          />
          <BrandPadCountdown
            endsAt={pad.endsAt}
            participantCount={pad.participantCount}
            minParticipants={pad.minParticipants}
          />
        </View>

        {token && me && parseBrandpadBigInt(me.contributed) > 0n ? (
          <View style={styles.block}>
            <SectionTitle>{t('brandpad_your_contribution')}</SectionTitle>
            <View style={styles.row}>
              <BalanceCoinIcon size={14} />
              <Text style={styles.rowLabel}>{t('brandpad_contributed')}</Text>
              <Text style={styles.rowValue}>
                {localeFormat(Number(parseBrandpadBigInt(me.contributed)))}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('brandpad_your_rank')}</Text>
              <Text style={styles.rowValue}>#{me.rank}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('brandpad_est_tokens')}</Text>
              <Text style={styles.rowValue}>
                {sumFormat(Number(parseBrandpadBigInt(me.tokensAllocated)))}
              </Text>
            </View>
            {parseBrandpadBigInt(me.bonusTokens) > 0n ? (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t('brandpad_bonus_tokens')}</Text>
                <Text style={[styles.rowValue, styles.bonus]}>
                  +{sumFormat(Number(parseBrandpadBigInt(me.bonusTokens)))}
                </Text>
              </View>
            ) : null}
            {myPreview ? (
              <MutedText style={styles.multHint}>
                {t('brandpad_est_multiplier')}:{' '}
                {formatMultiplier(myPreview.multiplier)}
              </MutedText>
            ) : null}
          </View>
        ) : null}

        <BrandPadTokenomics
          totalSupply={pad.totalSupply}
          brandpadAllocation={pad.brandpadAllocation}
          totalContributed={pad.totalContributed}
          status={pad.status}
          poolReserveTokens={launchedPoolQuery.data?.reserveTokens}
          poolReservePoints={launchedPoolQuery.data?.reservePoints}
        />

        {actionError ? (
          <Text style={styles.errorBanner}>{actionError}</Text>
        ) : null}

        {isActive && token ? (
          <TouchableOpacity
            style={styles.cta}
            onPress={() => setContributeOpen(true)}
            activeOpacity={0.85}
            disabled={contributeMut.isPending}>
            <Text style={styles.ctaText}>{t('brandpad_back_cta')}</Text>
          </TouchableOpacity>
        ) : !token ? (
          <MutedText style={styles.loginHint}>
            {t('brandpad_login_to_contribute')}
          </MutedText>
        ) : null}

        <BrandPadLeaderboard brandpadId={pad.id} />
      </ScrollView>

      {pad && isActive ? (
        <BrandPadContributePanel
          visible={contributeOpen}
          onClose={() => setContributeOpen(false)}
          userBalance={userBalance}
          totalContributed={pad.totalContributed}
          brandpadAllocation={pad.brandpadAllocation}
          currentRank={me?.rank}
          busy={contributeMut.isPending}
          onContribute={amount => contributeMut.mutate(amount)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: space.md,
    paddingBottom: space.xl * 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.lg,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontFamily: fontFamily.semibold,
    marginBottom: space.sm,
    textAlign: 'center',
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
  },
  errorBanner: {
    color: colors.error,
    marginBottom: space.sm,
    fontFamily: fontFamily.regular,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: space.lg,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceMuted,
    marginBottom: space.md,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 22,
    fontFamily: fontFamily.bold,
    textAlign: 'center',
    marginBottom: space.xs,
  },
  desc: {
    textAlign: 'center',
    paddingHorizontal: space.md,
  },
  block: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: space.md,
    marginBottom: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  rowLabel: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: fontFamily.regular,
  },
  rowValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fontFamily.semibold,
  },
  bonus: {
    color: '#22c55e',
  },
  multHint: {
    marginTop: space.sm,
  },
  cta: {
    backgroundColor: '#7C3AED',
    borderRadius: radii.pill,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: space.md,
  },
  ctaText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: fontFamily.semibold,
  },
  loginHint: {
    textAlign: 'center',
    marginBottom: space.md,
  },
});
