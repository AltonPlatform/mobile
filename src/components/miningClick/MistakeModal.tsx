import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {AppModal, PrimaryButton, SecondaryButton} from '../ui';
import {colors, space} from '../../theme/tokens';
import {fontFamily} from '../../theme/typography';

type Props = {
  visible: boolean;
  livesRemaining: number;
  onWatchAd: () => void;
  onUseLife: () => void;
  onEnd: () => void;
};

export function MistakeModal({
  visible,
  livesRemaining,
  onWatchAd,
  onUseLife,
  onEnd,
}: Props) {
  const {t} = useTranslation();

  return (
    <AppModal visible={visible} onClose={onEnd} variant="center">
      <Text style={styles.title}>{t('mining_click_mistake_title')}</Text>
      <Text style={styles.sub}>{t('mining_click_mistake_sub')}</Text>
      <View style={styles.actions}>
        <PrimaryButton
          title={t('mining_click_watch_ad')}
          onPress={onWatchAd}
          style={styles.btn}
        />
        {livesRemaining > 0 ? (
          <SecondaryButton
            title={t('mining_click_use_life', {count: livesRemaining})}
            onPress={onUseLife}
            style={styles.btn}
          />
        ) : null}
        <SecondaryButton
          title={t('mining_click_end_game')}
          onPress={onEnd}
          style={styles.btn}
        />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontFamily: fontFamily.bold,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: space.sm,
  },
  sub: {
    color: colors.textSecondary,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: space.lg,
  },
  actions: {
    gap: space.sm,
  },
  btn: {
    width: '100%',
  },
});
