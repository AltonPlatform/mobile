import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
  Dimensions,
  Animated,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useMutation, useQuery} from '@tanstack/react-query';
import {usePoolsSummaryLive} from '../hooks/usePoolsSummaryLive';
import {fetchActiveBrandPad} from '../api/brandpad';

import {UserProfileHeader} from '../components/UserProfileHeader';
import {MiningBlock} from '../components/MiningBlock';
import {ComboBlock} from '../components/ComboBlock';
import {BullcoinFilledGlow} from '../components/BullcoinFilledGlow';
import {BullcoinLiquidFill} from '../components/BullcoinLiquidFill';
import {useUserContext} from '../context/UserContext';
import {api} from '../api/client';
import type {HomeStackParamList} from '../navigation/MainTabs';
import {AppModal, AppModalClose} from '../components/ui';
import {colors, radii} from '../theme/tokens';
import {fontFamily} from '../theme/typography';
import {isToday, isYesterday, countDays, sumFormat} from '../utils/fortune';
import {
  getFarmingBullcoinFillPercent,
  isFarmingClaimReady,
} from '../utils/poolFarmingCycle';
import {formatTonFriendlyShort} from '../utils/walletDisplay';
import {useTonConnect} from '../hooks/useTonConnect';
import {useSyncWalletWithBackend} from '../hooks/useSyncWalletWithBackend';
import {
  TicketIcon,
  PointCoinIcon,
  BalanceCoinIcon,
  BullcoinIcon,
} from '../components/Icons';
const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');
/** animation.css `.bullcoin` — width/height: 25vh; на узких экранах ограничиваем шириной */
const COIN_SIZE = Math.round(
  Math.min(SCREEN_HEIGHT * 0.25, SCREEN_WIDTH * 0.92),
);

export function HomeScreen() {
  const {t} = useTranslation();
  const nav = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const insets = useSafeAreaInsets();
  const {userData, refetchUser, token} = useUserContext();
  const {walletAccount, connected, restoring, pickerBusy, connect, disconnect} =
    useTonConnect();

  const coinFade = useRef(new Animated.Value(0)).current;

  const poolsSummaryQuery = usePoolsSummaryLive(!!token);
  const lastFarmingClaimAt =
    poolsSummaryQuery.data?.lastFarmingClaimAt ?? null;
  const totalUnclaimed = poolsSummaryQuery.estimatedUnclaimed;

  // ── Bullcoin fill: 0→100 за cooldown; 100% + glow когда claim готов (как TWA) ──
  const percentage = getFarmingBullcoinFillPercent(
    lastFarmingClaimAt,
    totalUnclaimed,
    poolsSummaryQuery.displayNowMs,
  );

  useEffect(() => {
    coinFade.setValue(0);
    Animated.timing(coinFade, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [lastFarmingClaimAt, coinFade]);

  const chartTickets =
    userData && typeof userData.chartTickets === 'number'
      ? userData.chartTickets
      : 0;

  const miningTickets =
    userData && typeof userData.miningTickets === 'number'
      ? userData.miningTickets
      : 0;

  const activeBrandpadQuery = useQuery({
    queryKey: ['brandpad', 'active'],
    queryFn: fetchActiveBrandPad,
    staleTime: 60_000,
  });
  const activeBrandpad = activeBrandpadQuery.data;

  const claimReady = isFarmingClaimReady(lastFarmingClaimAt, totalUnclaimed);
  const coinFilled = claimReady;

  // ── Daily bonus modal ──
  const [dailyBonusOpen, setDailyBonusOpen] = useState(false);
  const [dailyReward, setDailyReward] = useState<{
    point?: number;
    balance?: number;
  } | null>(null);

  const dailyBonusMut = useMutation({
    mutationFn: async () => {
      const {data} = await api.post('/api/users/daily');
      return data;
    },
    onSuccess: () => refetchUser(),
  });

  useEffect(() => {
    if (!userData?.lastBonusDate) {
      return;
    }
    if (!isToday(userData.lastBonusDate)) {
      let countDaysVal =
        typeof userData.countBonusDays === 'number'
          ? userData.countBonusDays
          : 1;
      if (!isYesterday(userData.lastBonusDate)) {
        countDaysVal = 1;
      } else {
        countDaysVal = (countDaysVal % 7) + 1;
      }
      const reward = countDays(countDaysVal);
      if (reward) {
        setDailyReward(reward);
        setDailyBonusOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.lastBonusDate]);

  const closeDailyBonus = async () => {
    dailyBonusMut.mutate();
    setDailyBonusOpen(false);
  };

  // ── Mission modal ──
  const [missionModalOpen, setMissionModalOpen] = useState(false);
  const [missionNames, setMissionNames] = useState<any[]>([]);

  const missionsQuery = useQuery({
    queryKey: ['missions'],
    queryFn: async () => {
      const {data} = await api.get('/api/missions');
      return data as any[];
    },
  });

  useEffect(() => {
    if (!missionsQuery.isSuccess || !userData?.missions) {
      return;
    }
    const lang = userData.language_code ?? 'en';
    const filtered = (missionsQuery.data ?? []).filter((m: any) => {
      if (!m.special) {
        return false;
      }
      if (!m.language) {
        return true;
      }
      if (lang === 'en') {
        return m.language === 'en';
      }
      return m.language === 'ru' || m.language === 'uk';
    });
    const incomplete = filtered.filter((m: any) => {
      const um = userData.missions?.find(
        (u: {id: string}) => u.id === m._id,
      );
      return um && um.status !== 'completed';
    });
    if (incomplete.length > 0 && (userData.miningSpeed ?? 0) > 1) {
      if (!dailyBonusOpen) {
        setMissionNames(incomplete);
        setMissionModalOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionsQuery.isSuccess, userData, dailyBonusOpen]);

  const closeMissionModal = () => setMissionModalOpen(false);

  useSyncWalletWithBackend({
    walletAccount,
    userWallet: userData?.wallet,
    refetchUser,
    disconnect,
  });

  /** Mirrors web `UserProfile.handleWalletConnect`: connect in place vs navigate to Wallet when already linked. */
  const handleWalletPress = async () => {
    if (restoring) {
      return;
    }
    if (pickerBusy) {
      return;
    }
    if (connected) {
      nav.navigate('Wallet');
      return;
    }
    void connect();
  };

  const walletButtonLabel = useMemo(() => {
    if (restoring) {
      return t('Wallet');
    }
    if (pickerBusy) {
      return t('Connecting...', {defaultValue: 'Connecting...'});
    }
    const addr =
      walletAccount?.address &&
      typeof walletAccount.address === 'string'
        ? walletAccount.address.trim()
        : '';
    return addr ? formatTonFriendlyShort(addr) : t('Wallet');
  }, [walletAccount?.address, pickerBusy, restoring, t]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.container,
        {paddingTop: Math.max(insets.top, 12)},
      ]}
      showsVerticalScrollIndicator={false}>
      <UserProfileHeader
        walletButtonLabel={walletButtonLabel}
        walletConnected={connected}
        walletRestoring={restoring}
        walletConnecting={pickerBusy}
        onWalletPress={handleWalletPress}
      />

      {/* App.css `.home-block` + `.home-container` + animation.css `.bullcoin` + `.liquid` */}
      <View style={styles.homeBlock}>
        <ComboBlock />
        <View style={styles.homeContainer}>
          <Animated.View
            style={[styles.bullcoinFade, {opacity: coinFade}]}
            pointerEvents="box-none">
            <BullcoinFilledGlow size={COIN_SIZE} active={coinFilled}>
              <View
                style={[
                  styles.bullcoin,
                  {
                    width: COIN_SIZE,
                    height: COIN_SIZE,
                    borderRadius: COIN_SIZE / 2,
                  },
                ]}>
                <View style={styles.bullcoinGraphic}>
                  <BullcoinIcon size={COIN_SIZE} />
                </View>
                <BullcoinLiquidFill size={COIN_SIZE} percentage={percentage} />
              </View>
            </BullcoinFilledGlow>
          </Animated.View>
        </View>
      </View>

      {/* Farming pools: claim (Profit Per Hour внутри MiningBlock) */}
      <View style={styles.miningWrap}>
        <MiningBlock />
      </View>

      {/* Spacer pushes grid to bottom */}
      <View style={styles.spacer} />

      <TouchableOpacity
        style={[styles.tile, styles.chartGameTile]}
        onPress={() => nav.navigate('ChartGame')}
        activeOpacity={0.85}>
        <View style={styles.brandsTitleRow}>
          <Text style={styles.tileTitle}>{t('chart_game_title')}</Text>
          <TicketIcon size={14} color="#38bdf8" />
        </View>
        <View style={styles.tileDescRow}>
          <Text style={styles.tileDesc}>{chartTickets || 0}/20</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tile, styles.miningClickTile]}
        onPress={() => nav.navigate('MiningClick')}
        activeOpacity={0.85}>
        <View style={styles.brandsTitleRow}>
          <Text style={styles.tileTitle}>{t('mining_click_title')}</Text>
          <TicketIcon size={14} color="#22c55e" />
        </View>
        <View style={styles.tileDescRow}>
          <Text style={styles.tileDesc}>{miningTickets || 0}/20</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tile, styles.brandpadTile]}
        onPress={() =>
          nav.navigate('BrandPad', {
            brandpadId: activeBrandpad?.id,
          })
        }
        activeOpacity={0.85}>
        <View style={styles.brandsTitleRow}>
          <Text style={styles.tileTitle}>{t('brandpad_title')}</Text>
          <TicketIcon size={14} color="#A855F7" />
        </View>
        <View style={styles.tileDescRow}>
          <Text style={styles.tileDesc} numberOfLines={1}>
            {activeBrandpad
              ? activeBrandpad.name
              : t('brandpad_no_active_short')}
          </Text>
        </View>
        {activeBrandpad ? (
          <Text style={styles.tileSub}>
            {t('brandpad_tile_participants', {
              count: activeBrandpad.participantCount,
            })}
          </Text>
        ) : null}
      </TouchableOpacity>

      <AppModal
        visible={dailyBonusOpen}
        onClose={closeDailyBonus}
        variant="bottomSheet">
        <AppModalClose onPress={closeDailyBonus} />
            <Text style={styles.modalTitle}>
              {t('Claim your daily bonus and keep the rewards coming')}
            </Text>
            <View style={styles.modalInfo}>
              <Text style={styles.modalInfoLabel}>{t('Reward')}:</Text>
              {dailyReward && (
                <View style={styles.rewardItems}>
                  {dailyReward.point ? (
                    <View style={styles.rewardItem}>
                      <PointCoinIcon size={20} />
                      <Text style={styles.rewardItemText}>
                        {sumFormat(dailyReward.point)}
                      </Text>
                    </View>
                  ) : null}
                  {dailyReward.balance ? (
                    <View style={styles.rewardItem}>
                      <BalanceCoinIcon size={20} />
                      <Text style={styles.rewardItemText}>
                        {sumFormat(dailyReward.balance)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={closeDailyBonus}
              activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>{t('Claim')}</Text>
            </TouchableOpacity>
      </AppModal>

      <AppModal
        visible={missionModalOpen}
        onClose={closeMissionModal}
        variant="bottomSheet">
        <AppModalClose onPress={closeMissionModal} />
            <Text style={styles.modalTitle}>{t('Special missions')}</Text>
            <Text style={styles.modalDesc}>
              {t('You have uncompleted missions')}
            </Text>
            <View style={styles.missionList}>
              {missionNames.map((m: any, idx: number) => (
                <View key={idx} style={styles.missionRow}>
                  <PointCoinIcon size={20} />
                  <Text style={styles.missionText}>{t(m.title)}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                closeMissionModal();
                nav.getParent()?.navigate('Missions');
              }}
              activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>
                {t('Go To Missions')}
              </Text>
            </TouchableOpacity>
      </AppModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.bg},
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  /** App.css `.home-block` */
  homeBlock: {
    position: 'relative',
    alignItems: 'center',
    alignSelf: 'stretch',
    paddingVertical: 20,
    overflow: 'visible',
  },
  /** App.css `.home-container` */
  homeContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    overflow: 'visible',
  },
  /** animation.css `.bullcoin` — fadeIn задаётся через Animated */
  bullcoinFade: {
    backfaceVisibility: 'hidden',
    overflow: 'visible',
  },
  /** animation.css `.bullcoin` */
  bullcoin: {
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  /** SVG монеты (аналог background-image на TWA) */
  bullcoinGraphic: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    flex: 1,
  },

  /* Mining wrap */
  miningWrap: {
    width: '100%',
    marginBottom: 16,
  },

  tile: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 16,
    overflow: 'hidden',
    height: 80,
    justifyContent: 'center',
  },
  chartGameTile: {
    width: '100%',
  },
  miningClickTile: {
    marginTop: 8,
    width: '100%',
  },
  brandpadTile: {
    marginTop: 8,
    width: '100%',
    minHeight: 72,
  },
  tileSub: {
    fontSize: 10,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    marginTop: 4,
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: fontFamily.semibold,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  tileDescRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tileDesc: {
    fontSize: 10,
    color: colors.textMuted,
    fontFamily: fontFamily.regular,
    textTransform: 'capitalize',
  },
  brandsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  /* Modal content (AppModal shell) */
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 8,
    fontFamily: fontFamily.bold,
  },
  modalDesc: {
    fontSize: 14,
    color: '#757f9c',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: fontFamily.regular,
  },
  modalInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalInfoLabel: {
    fontSize: 14,
    color: '#757f9c',
    fontWeight: '400',
    marginBottom: 8,
    fontFamily: fontFamily.regular,
  },
  rewardItems: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: fontFamily.semibold,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },

  /* Mission list */
  missionList: {
    marginTop: 24,
    marginBottom: 32,
    gap: 12,
  },
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  missionText: {
    fontSize: 14,
    color: '#838898',
    fontFamily: fontFamily.regular,
    flex: 1,
  },
});
