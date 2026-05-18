import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';

import type {BrandPadStatus} from '../types/brandpad';
import {colors, radii, space} from '../theme/tokens';
import {fontFamily} from '../theme/typography';
import {SectionTitle, MutedText} from './ui';
import {sumFormat} from '../utils/formatNumbers';
import {
  computeBrandpadTokenomicsSplit,
  parseBrandpadBigInt,
} from '../utils/brandpadAllocation';

type Props = {
  totalSupply: string;
  brandpadAllocation: string;
  totalContributed: string;
  status: BrandPadStatus;
  /** After launch — real pool reserves from API */
  poolReserveTokens?: string | null;
  poolReservePoints?: string | null;
};

function formatTokenAmount(n: bigint): string {
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  const safe = n > max ? max : n;
  return sumFormat(Number(safe));
}

function formatPointsAmount(s: string): string {
  const n = parseBrandpadBigInt(s);
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  const safe = n > max ? max : n;
  return sumFormat(Number(safe));
}

export function BrandPadTokenomics({
  totalSupply,
  brandpadAllocation,
  totalContributed,
  status,
  poolReserveTokens,
  poolReservePoints,
}: Props) {
  const {t} = useTranslation();

  const split = useMemo(
    () => computeBrandpadTokenomicsSplit(totalSupply, brandpadAllocation),
    [totalSupply, brandpadAllocation],
  );

  const launched = status === 'succeeded' && Boolean(poolReserveTokens);
  const poolTokensLabel = launched
    ? formatTokenAmount(parseBrandpadBigInt(poolReserveTokens))
    : formatTokenAmount(split.poolTokens);
  const poolPointsLabel = launched
    ? formatPointsAmount(poolReservePoints ?? '0')
    : formatPointsAmount(totalContributed);

  const barBrandpadFlex = Math.max(1, Math.round(split.brandpadPercent));
  const barPoolFlex = Math.max(1, Math.round(split.poolPercent));

  return (
    <View style={styles.box}>
      <SectionTitle>{t('brandpad_tokenomics_title')}</SectionTitle>

      <View style={styles.bar}>
        <View
          style={[
            styles.segmentBrandpad,
            {flex: barBrandpadFlex},
          ]}
        />
        <View style={[styles.segmentPool, {flex: barPoolFlex}]} />
      </View>

      <View style={styles.rows}>
        <TokenomicsRow
          label={t('brandpad_tokenomics_total')}
          value={formatTokenAmount(split.totalSupply)}
          sub={t('brandpad_tokens_unit')}
        />
        <TokenomicsRow
          label={t('brandpad_tokenomics_backers')}
          value={formatTokenAmount(split.brandpadTokens)}
          sub={`${split.brandpadPercent.toFixed(0)}% · ${t('brandpad_tokens_unit')}`}
          accent="#A855F7"
        />
        <TokenomicsRow
          label={t('brandpad_tokenomics_pool_tokens')}
          value={poolTokensLabel}
          sub={
            launched
              ? `${t('brandpad_tokenomics_actual')} · ${t('brandpad_tokens_unit')}`
              : `${split.poolPercent.toFixed(0)}% · ${t('brandpad_tokenomics_at_launch')}`
          }
          accent="#3b82f6"
        />
        <TokenomicsRow
          label={t('brandpad_tokenomics_pool_balance')}
          value={poolPointsLabel}
          sub={
            launched
              ? t('brandpad_tokenomics_actual')
              : t('brandpad_coins')
          }
          accent="#22c55e"
        />
      </View>

      {status === 'active' ? (
        <MutedText style={styles.hint}>
          {t('brandpad_tokenomics_active_hint')}
        </MutedText>
      ) : null}
    </View>
  );
}

function TokenomicsRow({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        {accent ? (
          <View style={[styles.dot, {backgroundColor: accent}]} />
        ) : null}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowValue}>{value}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: space.md,
    marginBottom: space.md,
  },
  bar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: radii.sm,
    overflow: 'hidden',
    marginBottom: space.md,
  },
  segmentBrandpad: {
    backgroundColor: '#A855F7',
    minWidth: 4,
  },
  segmentPool: {
    backgroundColor: '#3b82f6',
    minWidth: 4,
  },
  rows: {
    gap: space.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.md,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fontFamily.regular,
    flexShrink: 1,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fontFamily.semibold,
  },
  rowSub: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  hint: {
    marginTop: space.sm,
    fontSize: 12,
  },
});
