import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useInfiniteQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';

import {fetchBrandPadLeaderboard} from '../api/brandpad';
import {useUserContext} from '../context/UserContext';
import type {BrandPadBacker} from '../types/brandpad';
import {backerAvatarUrl} from '../utils/brandpadDicebear';
import {colors, radii, space} from '../theme/tokens';
import {fontFamily} from '../theme/typography';
import {localeFormat, sumFormat} from '../utils/formatNumbers';
import {MutedText, SectionTitle} from './ui';

type Props = {
  brandpadId: string;
};

function displayName(b: BrandPadBacker): string {
  if (b.username?.trim()) {
    const u = b.username.trim();
    return u.length > 12 ? `${u.slice(0, 10)}…` : u;
  }
  if (b.firstName?.trim()) {
    return b.firstName.trim();
  }
  return `User ${b.userId}`;
}

function formatContributed(s: string): number {
  try {
    const n = Number(BigInt(s));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function formatTokens(s: string): string {
  try {
    const n = Number(BigInt(s));
    if (!Number.isFinite(n)) {
      return '—';
    }
    return sumFormat(n);
  } catch {
    return '—';
  }
}

export function BrandPadLeaderboard({brandpadId}: Props) {
  const {t} = useTranslation();
  const {userData} = useUserContext();
  const myId =
    typeof userData?.user_id === 'number' ? userData.user_id : null;
  const [expanded, setExpanded] = useState(false);

  const q = useInfiniteQuery({
    queryKey: ['brandpad', brandpadId, 'leaderboard'],
    queryFn: ({pageParam}) =>
      fetchBrandPadLeaderboard(brandpadId, {
        limit: 20,
        offset: pageParam as number,
      }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((acc, p) => acc + p.items.length, 0);
      if (loaded >= last.total) {
        return undefined;
      }
      return loaded;
    },
  });

  const items = q.data?.pages.flatMap(p => p.items) ?? [];
  const total = q.data?.pages[0]?.total ?? 0;
  const visible = expanded ? items : items.slice(0, 20);

  const loadMore = useCallback(() => {
    if (q.hasNextPage && !q.isFetchingNextPage) {
      q.fetchNextPage().catch(() => {});
    }
  }, [q]);

  if (q.isPending) {
    return (
      <View style={styles.box}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (q.isError) {
    return (
      <View style={styles.box}>
        <SectionTitle>{t('brandpad_bakers')}</SectionTitle>
        <MutedText>{t('Something went wrong')}</MutedText>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <View style={styles.headerRow}>
        <SectionTitle>{t('brandpad_bakers')}</SectionTitle>
        <Text style={styles.total}>{total}</Text>
      </View>
      <Text style={styles.hint}>{t('brandpad_top16_hint')}</Text>

      {visible.length === 0 ? (
        <MutedText style={styles.empty}>{t('brandpad_leaderboard_empty')}</MutedText>
      ) : (
        visible.map(b => {
          const isMe = myId != null && b.userId === myId;
          return (
          <View
            key={`${b.userId}-${b.rank}`}
            style={[styles.row, isMe && styles.rowMe]}>
            <Text style={styles.rank}>{b.rank}</Text>
            <Image
              source={{uri: backerAvatarUrl(b.userId, 36)}}
              style={styles.avatar}
            />
            <View style={styles.mid}>
              <Text style={styles.name} numberOfLines={1}>
                {displayName(b)}
              </Text>
              <Text style={styles.pts}>
                {t('brandpad_coins')} {localeFormat(formatContributed(b.contributed))}
              </Text>
            </View>
            <View style={styles.right}>
              {b.bonusPercent ? (
                <View style={styles.bonusBadge}>
                  <Text style={styles.bonusText}>+{b.bonusPercent}%</Text>
                </View>
              ) : null}
              <Text style={styles.tokens}>{formatTokens(b.tokensAllocated)}</Text>
              {b.multiplier ? (
                <View style={styles.multBadge}>
                  <Text style={styles.multText}>{b.multiplier}</Text>
                </View>
              ) : null}
            </View>
          </View>
          );
        })
      )}

      {!expanded && items.length > 20 ? (
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() => setExpanded(true)}
          activeOpacity={0.85}>
          <Text style={styles.moreText}>{t('brandpad_show_all_bakers')}</Text>
        </TouchableOpacity>
      ) : null}

      {expanded && q.hasNextPage ? (
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={loadMore}
          disabled={q.isFetchingNextPage}
          activeOpacity={0.85}>
          {q.isFetchingNextPage ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={styles.moreText}>{t('farming_load_more')}</Text>
          )}
        </TouchableOpacity>
      ) : null}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  total: {
    color: colors.textMuted,
    fontSize: 14,
    fontFamily: fontFamily.medium,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fontFamily.regular,
    marginBottom: space.md,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    gap: 8,
  },
  rowMe: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    marginHorizontal: -space.sm,
    paddingHorizontal: space.sm,
    borderRadius: radii.sm,
  },
  rank: {
    width: 22,
    color: colors.textMuted,
    fontSize: 13,
    fontFamily: fontFamily.semibold,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
  },
  mid: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fontFamily.medium,
  },
  pts: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
    maxWidth: 100,
  },
  bonusBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  bonusText: {
    color: '#22c55e',
    fontSize: 10,
    fontFamily: fontFamily.semibold,
  },
  tokens: {
    color: colors.textPrimary,
    fontSize: 12,
    fontFamily: fontFamily.semibold,
  },
  multBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  multText: {
    color: '#A855F7',
    fontSize: 10,
    fontFamily: fontFamily.semibold,
  },
  moreBtn: {
    alignItems: 'center',
    paddingVertical: space.md,
  },
  moreText: {
    color: colors.primary,
    fontFamily: fontFamily.semibold,
    fontSize: 14,
  },
});
