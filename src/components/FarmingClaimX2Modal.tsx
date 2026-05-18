import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useTranslation} from 'react-i18next';

import {AppModal, AppModalClose} from './ui/AppModal';
import {BalanceCoinIcon} from './Icons';
import {colors, radii} from '../theme/tokens';
import {fontFamily} from '../theme/typography';
import {
  doublePoolBigIntString,
  formatPoolBigInt,
} from '../utils/poolFormat';

const TIMER_SECONDS = 5;
const TICK_MS = 100;

type Props = {
  visible: boolean;
  onClose: () => void;
  baseReward: string | null | undefined;
  onClaimRegular: () => void;
  onGetX2: () => void;
  claimPending?: boolean;
  adLoading?: boolean;
  /** Увеличивается при ошибке рекламы — возобновить таймер обычного claim. */
  resumeTimerSignal?: number;
};

function ClaimCountdownBar({
  stopTimer,
  onComplete,
}: {
  stopTimer: boolean;
  onComplete: () => void;
}) {
  const [fillWidth, setFillWidth] = useState(100);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    completedRef.current = false;
    setFillWidth(100);
  }, []);

  useEffect(() => {
    if (stopTimer) {
      return;
    }
    const step = 100 / (TIMER_SECONDS * (1000 / TICK_MS));
    const id = setInterval(() => {
      setFillWidth(prev => {
        const next = Math.max(0, prev - step);
        if (next <= 0 && !completedRef.current) {
          completedRef.current = true;
          clearInterval(id);
          onCompleteRef.current();
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [stopTimer]);

  return (
    <View style={countdownStyles.track}>
      <View style={[countdownStyles.fill, {width: `${fillWidth}%`}]} />
    </View>
  );
}

const countdownStyles = StyleSheet.create({
  track: {
    width: 240,
    alignSelf: 'center',
    marginTop: 12,
    height: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#46506D',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
  },
});

export function FarmingClaimX2Modal({
  visible,
  onClose,
  baseReward,
  onClaimRegular,
  onGetX2,
  claimPending,
  adLoading,
  resumeTimerSignal = 0,
}: Props) {
  const {t} = useTranslation();
  const [stopTimer, setStopTimer] = useState(false);
  const claimedRef = useRef(false);

  const baseDisplay = formatPoolBigInt(baseReward);
  const doubledDisplay = formatPoolBigInt(doublePoolBigIntString(baseReward));

  useEffect(() => {
    if (visible) {
      setStopTimer(false);
      claimedRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (resumeTimerSignal > 0) {
      setStopTimer(false);
    }
  }, [resumeTimerSignal]);

  const runRegularClaimOnce = () => {
    if (claimedRef.current) {
      return;
    }
    claimedRef.current = true;
    onClaimRegular();
  };

  const handleClose = () => {
    onClose();
  };

  const handleTimerComplete = () => {
    runRegularClaimOnce();
    onClose();
  };

  const handleGetX2 = () => {
    setStopTimer(true);
    onGetX2();
  };

  return (
    <AppModal
      visible={visible}
      onClose={handleClose}
      variant="center"
      dismissOnBackdrop={!claimPending && !adLoading}>
      <AppModalClose onPress={handleClose} />
      <Text style={styles.title}>{t('You can claim x2 of your points')}</Text>
      <Text style={styles.description}>
        {t('look the ad')}
        {'\n'}
        {t('farming_claim_x2_hint')}
      </Text>
      <View style={styles.rewardRow}>
        <Text style={styles.rewardLabel}>{t('Reward')}:</Text>
        <View style={styles.rewardValues}>
          <BalanceCoinIcon size={14} />
          <Text style={styles.rewardStrike}>{baseDisplay}</Text>
          <Text style={styles.rewardX2}>{doubledDisplay}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.x2Btn, (claimPending || adLoading) && styles.x2BtnDisabled]}
        onPress={handleGetX2}
        disabled={claimPending || adLoading}
        activeOpacity={0.85}>
        {adLoading ? (
          <ActivityIndicator color={colors.textPrimary} />
        ) : (
          <Text style={styles.x2BtnText}>
            {claimPending ? t('Claiming...') : t('Get X2')}
          </Text>
        )}
      </TouchableOpacity>
      {visible ? (
        <ClaimCountdownBar
          key={`claim-timer-${resumeTimerSignal}`}
          stopTimer={stopTimer || !!claimPending}
          onComplete={handleTimerComplete}
        />
      ) : null}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: fontFamily.bold,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: fontFamily.regular,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  rewardLabel: {
    fontSize: 14,
    color: colors.textMuted,
    fontFamily: fontFamily.semibold,
  },
  rewardValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardStrike: {
    fontSize: 12,
    color: '#757F9C',
    textDecorationLine: 'line-through',
    fontFamily: fontFamily.semibold,
  },
  rewardX2: {
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: fontFamily.semibold,
  },
  x2Btn: {
    backgroundColor: '#46506D',
    borderRadius: radii.pill,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
  },
  x2BtnDisabled: {
    opacity: 0.7,
  },
  x2BtnText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: fontFamily.semibold,
  },
});
