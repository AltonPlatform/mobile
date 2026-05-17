import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';

import {
  fetchMiningGameConfig,
  type TicketTier,
} from '../api/miningClick';
import {formatApiError} from '../api/errors';
import {useGameLoop} from '../hooks/useGameLoop';
import {useGameSession} from '../hooks/useGameSession';
import {useAppodealRewarded} from '../hooks/useAppodeal';
import {useUserContext} from '../context/UserContext';
import {maxRewardPreview} from '../utils/miningHashrate';
import {PentagonBlocks} from '../components/miningClick/PentagonBlocks';
import {HashGraph} from '../components/miningClick/HashGraph';
import {ComboBar} from '../components/miningClick/ComboBar';
import {StressFrame} from '../components/miningClick/StressFrame';
import {MistakeModal} from '../components/miningClick/MistakeModal';
import {MiningComboLeaderboard} from '../components/miningClick/MiningComboLeaderboard';
import {BalanceCoinIcon, TicketIcon} from '../components/Icons';
import {
  Card,
  MutedText,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '../components/ui';
import {colors, radii, space} from '../theme/tokens';
import {fontFamily} from '../theme/typography';

const PENTAGON_SIZE = Math.min(Dimensions.get('window').width - 48, 320);
const GRAPH_W = Dimensions.get('window').width - 48;
const GRAPH_H = 72;

const TIERS: TicketTier[] = ['none', 'bronze', 'silver', 'gold', 'diamond'];

export function MiningClickScreen() {
  const {t} = useTranslation();
  const {refetchUser, userData} = useUserContext();
  const queryClient = useQueryClient();
  const game = useGameSession();
  const [selectedStake, setSelectedStake] = useState<number | null>(null);
  const [useTicket, setUseTicket] = useState(false);
  const [ticketTier, setTicketTier] = useState<TicketTier>('bronze');
  const [shake, setShake] = useState(false);
  const [flashBlock, setFlashBlock] = useState<number | null>(null);
  const [clickBusy, setClickBusy] = useState(false);

  const configQ = useQuery({
    queryKey: ['miningGameConfig'],
    queryFn: fetchMiningGameConfig,
  });
  const config = configQ.data;

  useEffect(() => {
    if (config?.allowedStakes?.length && selectedStake == null) {
      setSelectedStake(config.allowedStakes[config.allowedStakes.length - 1]);
    }
  }, [config?.allowedStakes, selectedStake]);

  const tickets =
    config?.miningTickets ??
    (typeof userData?.miningTickets === 'number' ? userData.miningTickets : 0);

  const visualRewardRef = React.useRef(0);

  const loop = useGameLoop({
    running: game.phase === 'playing' || game.phase === 'mistake',
    paused: game.phase === 'mistake',
    startsAt: game.startsAt,
    stake: game.stake,
    clicks: game.clicks,
    onTimeout: () => {
      void endMut.mutate({
        reason: 'timeout',
        clientReward: Math.round(visualRewardRef.current),
      });
    },
  });

  visualRewardRef.current = loop.visualReward;

  const startMut = useMutation({
    mutationFn: async () => {
      if (selectedStake == null) {
        throw new Error('pick stake');
      }
      loop.reset();
      const wsPath = config?.wsPath ?? '/api/game/mining/ws';
      await game.startGame({
        stake: selectedStake,
        ticketTier: useTicket ? ticketTier : 'none',
        useTicket,
        wsPath,
      });
    },
    onSuccess: () => void refetchUser(),
    onError: (err: unknown) => Alert.alert(t('Error'), formatApiError(err)),
  });

  const invalidateLb = () => {
    void queryClient.invalidateQueries({queryKey: ['miningComboLeaderboard']});
  };

  const endMut = useMutation({
    mutationFn: async ({
      reason,
      clientReward,
    }: {
      reason: 'timeout' | 'overheat' | 'cashout';
      clientReward?: number;
    }) => {
      return game.endGame(reason, clientReward);
    },
    onSuccess: () => {
      void refetchUser();
      invalidateLb();
    },
    onError: (err: unknown) => Alert.alert(t('Error'), formatApiError(err)),
  });

  const {showRewarded} = useAppodealRewarded({
    onReward: () => {
      game.grantAdAndResolve().catch((e: unknown) => {
        Alert.alert(t('Error'), formatApiError(e));
      });
    },
    onFail: () => Alert.alert(t('Error'), t('mining_click_ad_unavailable')),
  });

  const onBlockPress = useCallback(
    async (index: number) => {
      if (game.phase !== 'playing' || clickBusy) {
        return;
      }
      setClickBusy(true);
      try {
        const res = await game.sendClick(index);
        if (res.mistake) {
          setShake(true);
          setTimeout(() => setShake(false), 400);
        } else {
          setFlashBlock(index);
          setTimeout(() => setFlashBlock(null), 200);
        }
      } catch (e: unknown) {
        Alert.alert(t('Error'), formatApiError(e));
      } finally {
        setClickBusy(false);
      }
    },
    [game, clickBusy, t],
  );

  const onStart = () => {
    if (useTicket && (!tickets || tickets <= 0)) {
      Alert.alert(t('Error'), t('mining_click_no_tickets'));
      return;
    }
    if (selectedStake == null) {
      Alert.alert(t('Error'), t('mining_click_pick_stake'));
      return;
    }
    startMut.mutate();
  };

  const busy = startMut.isPending || endMut.isPending || configQ.isLoading;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <SectionTitle>{t('mining_click_title')}</SectionTitle>

        <Card style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <BalanceCoinIcon size={18} />
            <Text style={styles.balanceText}>
              {t('mining_click_balance')}:{' '}
              {Math.floor(config?.balance ?? userData?.balance ?? 0)}
            </Text>
          </View>
          <View style={styles.balanceRow}>
            <TicketIcon size={16} color={colors.primary} />
            <MutedText>
              {t('mining_click_tickets')}: {tickets ?? 0}/20
            </MutedText>
          </View>
        </Card>

        {game.phase === 'idle' ? (
          <>
            <MutedText style={styles.hint}>{t('mining_click_hint')}</MutedText>
            {configQ.isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={styles.label}>{t('mining_click_stake')}</Text>
                <View style={styles.stakeRow}>
                  {(config?.allowedStakes ?? []).map(amount => (
                    <TouchableOpacity
                      key={amount}
                      style={[
                        styles.stakeChip,
                        selectedStake === amount &&
                          !useTicket &&
                          styles.stakeChipOn,
                      ]}
                      onPress={() => {
                        setUseTicket(false);
                        setSelectedStake(amount);
                      }}
                      disabled={useTicket}>
                      <Text
                        style={[
                          styles.stakeChipText,
                          selectedStake === amount &&
                            !useTicket &&
                            styles.stakeChipTextOn,
                        ]}>
                        {amount}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {selectedStake != null && !useTicket ? (
                  <MutedText style={styles.preview}>
                    {t('mining_click_max_preview', {
                      amount: maxRewardPreview(selectedStake),
                    })}
                  </MutedText>
                ) : null}
                <TouchableOpacity
                  style={[styles.ticketRow, useTicket && styles.ticketRowOn]}
                  onPress={() => {
                    if (tickets && tickets > 0) {
                      setUseTicket(true);
                    }
                  }}
                  disabled={!tickets}>
                  <TicketIcon size={18} />
                  <Text style={styles.ticketLabel}>
                    {t('mining_click_use_ticket')}
                  </Text>
                </TouchableOpacity>
                {useTicket ? (
                  <View style={styles.tierRow}>
                    {TIERS.filter(tier => tier !== 'none').map(tier => (
                      <TouchableOpacity
                        key={tier}
                        style={[
                          styles.tierChip,
                          ticketTier === tier && styles.tierChipOn,
                        ]}
                        onPress={() => setTicketTier(tier)}>
                        <Text
                          style={[
                            styles.tierText,
                            ticketTier === tier && styles.tierTextOn,
                          ]}>
                          {config?.ticketTiers?.[tier]?.label ?? tier} (
                          {config?.ticketTiers?.[tier]?.lives ?? 0})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
                <PrimaryButton
                  title={t('mining_click_start')}
                  onPress={onStart}
                  loading={startMut.isPending}
                  disabled={busy}
                  style={styles.btn}
                />
              </>
            )}
          </>
        ) : null}

        {game.phase === 'idle' ? <MiningComboLeaderboard /> : null}

        {game.phase === 'playing' || game.phase === 'mistake' ? (
          <StressFrame combo={game.combo} style={styles.gameArea}>
            <View style={styles.hud}>
              <Text style={styles.timer}>
                {loop.timeLeft.toFixed(1)}s
              </Text>
              <Text style={styles.hudStat}>
                {game.hashrate.toLocaleString()} H/s
              </Text>
              <Text style={styles.hudReward}>
                +{Math.floor(loop.visualReward)} 🪙
              </Text>
            </View>
            <HashGraph width={GRAPH_W} height={GRAPH_H} samples={loop.samples} />
            <ComboBar combo={game.combo} />
            <View style={styles.pentagonWrap}>
              <PentagonBlocks
                size={PENTAGON_SIZE}
                activeBlock={game.activeBlock}
                disabled={game.phase !== 'playing' || clickBusy}
                shake={shake}
                flashBlock={flashBlock}
                onPressBlock={onBlockPress}
              />
            </View>
            <PrimaryButton
              title={t('mining_click_cashout')}
              onPress={() =>
                endMut.mutate({
                  reason: 'cashout',
                  clientReward: Math.round(loop.visualReward),
                })
              }
              disabled={endMut.isPending || game.phase === 'mistake'}
              style={styles.cashoutBtn}
            />
          </StressFrame>
        ) : null}

        {game.phase === 'results' && game.endResult ? (
          <Card style={styles.resultCard}>
            <Text style={styles.resultTitle}>
              {game.endResult.reason === 'overheat'
                ? t('mining_click_overheat')
                : game.endResult.reason === 'cashout'
                  ? t('mining_click_cashout_done')
                  : t('mining_click_timeout')}
            </Text>
            <View style={styles.resultRewardRow}>
              <BalanceCoinIcon size={28} />
              <Text style={styles.resultReward}>
                +{game.endResult.verifiedReward}
              </Text>
            </View>
            {game.endResult.balance != null ? (
              <MutedText style={styles.resultBalance}>
                {t('mining_click_balance')}:{' '}
                {Math.floor(game.endResult.balance)}
              </MutedText>
            ) : null}
            <MutedText>
              {t('mining_click_stats', {
                clicks: game.endResult.totalClicks,
                combo: game.endResult.maxCombo,
              })}
            </MutedText>
            <PrimaryButton
              title={t('mining_click_play_again')}
              onPress={() => {
                game.resetToIdle();
                loop.reset();
                void configQ.refetch();
              }}
              style={styles.btn}
            />
          </Card>
        ) : null}
      </ScrollView>

      <MistakeModal
        visible={game.phase === 'mistake'}
        livesRemaining={game.livesRemaining}
        onWatchAd={() => showRewarded()}
        onUseLife={() => {
          game.resolveWithLife().catch((e: unknown) => {
            Alert.alert(t('Error'), formatApiError(e));
          });
        }}
        onEnd={() =>
          endMut.mutate({
            reason: 'overheat',
            clientReward: Math.round(loop.visualReward),
          })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: space.xl,
  },
  balanceCard: {
    marginBottom: space.md,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  balanceText: {
    color: colors.textPrimary,
    fontFamily: fontFamily.semibold,
    fontSize: 15,
  },
  hint: {
    marginBottom: space.md,
  },
  label: {
    color: colors.textSecondary,
    fontFamily: fontFamily.semibold,
    marginBottom: space.sm,
  },
  stakeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: space.sm,
  },
  stakeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stakeChipOn: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  stakeChipText: {
    color: colors.textSecondary,
    fontFamily: fontFamily.semibold,
  },
  stakeChipTextOn: {
    color: colors.primary,
  },
  preview: {
    marginBottom: space.sm,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.sm,
  },
  ticketRowOn: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  ticketLabel: {
    color: colors.textPrimary,
    fontFamily: fontFamily.medium,
  },
  tierRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: space.md,
  },
  tierChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tierChipOn: {
    borderColor: colors.primary,
  },
  tierText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fontFamily.medium,
  },
  tierTextOn: {
    color: colors.primary,
  },
  btn: {
    marginTop: space.sm,
  },
  gameArea: {
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
  },
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  timer: {
    color: colors.textPrimary,
    fontFamily: fontFamily.bold,
    fontSize: 18,
  },
  hudStat: {
    color: colors.primary,
    fontFamily: fontFamily.semibold,
    fontSize: 14,
  },
  hudReward: {
    color: '#22c55e',
    fontFamily: fontFamily.semibold,
    fontSize: 14,
  },
  pentagonWrap: {
    alignItems: 'center',
    marginVertical: space.md,
  },
  cashoutBtn: {
    marginTop: space.sm,
  },
  resultCard: {
    alignItems: 'center',
    paddingVertical: space.lg,
  },
  resultTitle: {
    color: colors.textPrimary,
    fontFamily: fontFamily.bold,
    fontSize: 20,
    marginBottom: space.sm,
  },
  resultRewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: space.sm,
  },
  resultReward: {
    color: '#a78bfa',
    fontFamily: fontFamily.bold,
    fontSize: 28,
  },
  resultBalance: {
    marginBottom: space.sm,
  },
});
