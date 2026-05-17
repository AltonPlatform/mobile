import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useMutation, useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';

import {
  addChartTicketAfterAd,
  fetchChartGameConfig,
  refundChartAfterAd,
  revealChartRound,
  startChartRound,
  type ChartCandle,
  type RevealRoundResponse,
  type StartRoundResponse,
} from '../api/chartGame';
import {formatApiError} from '../api/errors';
import {CHART_GAME_TOTAL_SLOTS} from '../utils/chartGameLayout';
import {ChartGamePriceChart} from '../components/ChartGamePriceChart';
import {BalanceCoinIcon, TicketIcon} from '../components/Icons';
import {useAppodealRewarded} from '../hooks/useAppodeal';
import {useUserContext} from '../context/UserContext';
import {
  Card,
  MutedText,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '../components/ui';
import {colors, radii, space} from '../theme/tokens';
import {fontFamily} from '../theme/typography';

type Phase = 'idle' | 'playing' | 'result';

export function ChartGameScreen() {
  const {t} = useTranslation();
  const {refetchUser, userData} = useUserContext();

  const [phase, setPhase] = useState<Phase>('idle');
  const [selectedStake, setSelectedStake] = useState<number | null>(null);
  const [useTicket, setUseTicket] = useState(false);
  const [round, setRound] = useState<StartRoundResponse | null>(null);
  const [reveal, setReveal] = useState<RevealRoundResponse | null>(null);
  const [revealStep, setRevealStep] = useState(0);

  const configQ = useQuery({
    queryKey: ['chartGameConfig'],
    queryFn: fetchChartGameConfig,
  });

  const config = configQ.data;
  const tickets =
    config?.chartTickets ??
    (typeof userData?.chartTickets === 'number' ? userData.chartTickets : 0);

  useEffect(() => {
    if (config?.allowedStakes?.length && selectedStake == null) {
      setSelectedStake(config.allowedStakes[config.allowedStakes.length - 1]);
    }
  }, [config?.allowedStakes, selectedStake]);

  const symbolLabel = useMemo(() => {
    if (!round?.symbol || !config?.symbolLabels) {
      return round?.symbol ?? '';
    }
    return config.symbolLabels[round.symbol] ?? round.symbol;
  }, [round?.symbol, config?.symbolLabels]);

  const startMut = useMutation({
    mutationFn: startChartRound,
    onSuccess: data => {
      setRound(data);
      setReveal(null);
      setRevealStep(0);
      setPhase('playing');
      void refetchUser();
    },
    onError: (err: unknown) => {
      Alert.alert(t('Error'), formatApiError(err));
    },
  });

  const revealMut = useMutation({
    mutationFn: ({
      roundId,
      prediction,
    }: {
      roundId: string;
      prediction: 'up' | 'down';
    }) => revealChartRound(roundId, prediction),
    onSuccess: data => {
      setReveal(data);
      setRevealStep(0);
      setPhase('result');
      void refetchUser();
    },
    onError: (err: unknown) => {
      Alert.alert(t('Error'), formatApiError(err));
    },
  });

  const refundMut = useMutation({
    mutationFn: refundChartAfterAd,
    onSuccess: () => {
      Alert.alert(t('chart_game_title'), t('chart_game_refund_ok'));
      void refetchUser();
      void configQ.refetch();
      resetToIdle();
    },
    onError: (err: unknown) => {
      Alert.alert(t('Error'), formatApiError(err));
    },
  });

  const ticketMut = useMutation({
    mutationFn: addChartTicketAfterAd,
    onSuccess: () => {
      void refetchUser();
      void configQ.refetch();
    },
    onError: (err: unknown) => {
      Alert.alert(t('Error'), formatApiError(err));
    },
  });

  const resetToIdle = useCallback(() => {
    setPhase('idle');
    setRound(null);
    setReveal(null);
    setRevealStep(0);
    setUseTicket(false);
    void configQ.refetch();
  }, [configQ]);

  const {showRewarded: showRefundAd} = useAppodealRewarded({
    onReward: () => refundMut.mutate(),
    onFail: () => Alert.alert(t('Error'), t('chart_game_ad_unavailable')),
  });

  const {showRewarded: showRetryAd} = useAppodealRewarded({
    onReward: () => {
      ticketMut.mutate(undefined, {
        onSuccess: () => {
          startMut.mutate({useTicket: true});
        },
      });
    },
    onFail: () => Alert.alert(t('Error'), t('chart_game_ad_unavailable')),
  });

  useEffect(() => {
    if (phase !== 'result' || !reveal?.revealCandles?.length) {
      return;
    }
    if (revealStep >= reveal.revealCandles.length) {
      return;
    }
    const id = setTimeout(() => setRevealStep(s => s + 1), 450);
    return () => clearTimeout(id);
  }, [phase, reveal, revealStep]);

  const visibleReveal = useMemo((): ChartCandle[] => {
    if (!reveal?.revealCandles) {
      return [];
    }
    return reveal.revealCandles.slice(0, revealStep);
  }, [reveal, revealStep]);

  const onStart = () => {
    if (useTicket) {
      if (!tickets || tickets <= 0) {
        Alert.alert(t('Error'), t('chart_game_no_tickets'));
        return;
      }
      startMut.mutate({useTicket: true});
      return;
    }
    if (selectedStake == null) {
      Alert.alert(t('Error'), t('chart_game_pick_stake'));
      return;
    }
    startMut.mutate({stake: selectedStake});
  };

  const onPredict = (prediction: 'up' | 'down') => {
    if (!round?.roundId) {
      return;
    }
    revealMut.mutate({roundId: round.roundId, prediction});
  };

  const busy =
    startMut.isPending || revealMut.isPending || configQ.isLoading;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <SectionTitle>{t('chart_game_title')}</SectionTitle>

        <Card style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <BalanceCoinIcon size={18} />
            <Text style={styles.balanceText}>
              {t('chart_game_balance')}:{' '}
              {Math.floor(config?.balance ?? userData?.balance ?? 0)}
            </Text>
          </View>
          <View style={styles.balanceRow}>
            <TicketIcon size={16} color={colors.primary} />
            <MutedText>
              {t('chart_game_tickets')}: {tickets ?? 0}/20
            </MutedText>
          </View>
        </Card>

        {phase === 'idle' ? (
          <>
            <MutedText style={styles.hint}>{t('chart_game_hint')}</MutedText>
            {configQ.isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={styles.label}>{t('chart_game_stake')}</Text>
                <View style={styles.stakeRow}>
                  {(config?.allowedStakes ?? []).map(amount => (
                    <TouchableOpacity
                      key={amount}
                      style={[
                        styles.stakeChip,
                        selectedStake === amount && !useTicket && styles.stakeChipOn,
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
                {(config?.allowedStakes?.length ?? 0) === 0 ? (
                  <MutedText style={styles.warn}>
                    {t('chart_game_no_stakes')}
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
                    {t('chart_game_use_ticket')}
                  </Text>
                </TouchableOpacity>
                <PrimaryButton
                  title={t('chart_game_start')}
                  onPress={onStart}
                  loading={startMut.isPending}
                  disabled={busy}
                  style={styles.btn}
                />
              </>
            )}
          </>
        ) : null}

        {(phase === 'playing' || phase === 'result') && round ? (
          <>
            <ChartGamePriceChart
              candles={round.candles}
              revealCandles={visibleReveal}
              emptyLabel={t('chart_game_chart_empty')}
              symbolLabel={symbolLabel}
              totalSlots={CHART_GAME_TOTAL_SLOTS}
            />
            {phase === 'playing' ? (
              <>
                <MutedText style={styles.predictHint}>
                  {t('chart_game_predict')}
                </MutedText>
                <View style={styles.predRow}>
                  <TouchableOpacity
                    style={[styles.predBtn, styles.predUp]}
                    onPress={() => onPredict('up')}
                    disabled={revealMut.isPending}>
                    <Text style={styles.predBtnText}>{t('chart_game_up')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.predBtn, styles.predDown]}
                    onPress={() => onPredict('down')}
                    disabled={revealMut.isPending}>
                    <Text style={styles.predBtnText}>
                      {t('chart_game_down')}
                    </Text>
                  </TouchableOpacity>
                </View>
                {revealMut.isPending ? (
                  <ActivityIndicator color={colors.primary} />
                ) : null}
              </>
            ) : null}

            {phase === 'result' && reveal ? (
              <Card style={styles.resultCard}>
                <Text
                  style={[
                    styles.resultTitle,
                    reveal.won ? styles.win : styles.loss,
                  ]}>
                  {reveal.won
                    ? t('chart_game_win', {payout: reveal.payout})
                    : t('chart_game_loss')}
                </Text>
                <MutedText>
                  {t('chart_game_result_line', {
                    result: reveal.result.toUpperCase(),
                    change: reveal.changePct,
                  })}
                </MutedText>
                <MutedText>
                  {t('chart_game_prices', {
                    from: reveal.priceAtCutoff.toFixed(2),
                    to: reveal.priceAfter6h.toFixed(2),
                  })}
                </MutedText>

                {!reveal.won ? (
                  <View style={styles.lossActions}>
                    {reveal.canRefundAd ? (
                      <PrimaryButton
                        title={t('chart_game_refund_ad')}
                        onPress={() => showRefundAd()}
                        loading={refundMut.isPending}
                        style={styles.btn}
                      />
                    ) : null}
                    {reveal.canRetryAd ? (
                      <TouchableOpacity
                        style={styles.outlineBtn}
                        onPress={() => showRetryAd()}
                        disabled={ticketMut.isPending || startMut.isPending}>
                        <Text style={styles.outlineBtnText}>
                          {t('chart_game_retry_ad')}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}

                <PrimaryButton
                  title={t('chart_game_play_again')}
                  onPress={resetToIdle}
                  style={styles.btn}
                />
              </Card>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {paddingBottom: space.xl},
  balanceCard: {marginBottom: space.md, gap: 8},
  balanceRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  balanceText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
  hint: {marginBottom: space.md},
  label: {
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: fontFamily.semibold,
  },
  stakeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: space.md,
  },
  stakeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.tabStrip,
  },
  stakeChipOn: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  stakeChipText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
  stakeChipTextOn: {color: colors.primary},
  warn: {marginBottom: space.md, color: '#fbbf24'},
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.md,
  },
  ticketRowOn: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  ticketLabel: {
    color: colors.textPrimary,
    fontFamily: fontFamily.medium,
  },
  btn: {marginTop: space.sm},
  predictHint: {textAlign: 'center', marginVertical: space.md},
  predRow: {flexDirection: 'row', gap: 12},
  predBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  predUp: {backgroundColor: 'rgba(74, 222, 128, 0.25)'},
  predDown: {backgroundColor: 'rgba(248, 113, 113, 0.25)'},
  predBtnText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
    fontFamily: fontFamily.bold,
  },
  resultCard: {marginTop: space.md, gap: 8},
  resultTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: fontFamily.bold,
  },
  win: {color: '#4ade80'},
  loss: {color: '#f87171'},
  lossActions: {marginTop: space.sm, gap: 8},
  outlineBtn: {
    paddingVertical: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  outlineBtnText: {
    color: colors.primary,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
});
