import React, {useCallback, useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useInfiniteQuery, useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import axios from 'axios';

import {fetchPoolCategories, fetchPoolsPage} from '../api/pools';
import {formatApiError} from '../api/errors';
import type {PoolsListSortBy, SerializedPool} from '../types/pools';
import {Screen, MutedText} from '../components/ui';
import {colors, radii, space} from '../theme/tokens';
import {fontFamily} from '../theme/typography';
import type {PoolsStackParamList} from '../navigation/MainTabs';

const SORT_OPTIONS: PoolsListSortBy[] = [
  'newest',
  'oldest',
  'name_asc',
  'name_desc',
  'spot_high',
  'spot_low',
];

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.lg,
  },
  errorText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    marginBottom: space.md,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radii.pill,
  },
  retryBtnText: {
    color: colors.textPrimary,
    fontFamily: fontFamily.semibold,
  },
  listContent: {
    paddingBottom: space.xl,
    flexGrow: 1,
  },
  listEmpty: {justifyContent: 'center'},
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontFamily: fontFamily.regular,
    padding: space.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: space.md,
    marginBottom: space.sm,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: fontFamily.semibold,
    marginBottom: 4,
  },
  cardCategory: {marginTop: 2},
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 8,
  },
  cardLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: fontFamily.regular,
  },
  cardValue: {
    color: colors.textPrimary,
    fontSize: 12,
    fontFamily: fontFamily.medium,
    flex: 1,
    textAlign: 'right',
  },
  footer: {
    paddingVertical: space.md,
    alignItems: 'center',
  },
  loadMoreBtn: {
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  loadMoreText: {
    color: colors.primary,
    fontFamily: fontFamily.semibold,
  },
  headerBtn: {marginRight: 4},
  headerBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontFamily: fontFamily.semibold,
  },
  filterBlock: {
    marginBottom: space.md,
    gap: space.sm,
  },
  searchRow: {flexDirection: 'row', alignItems: 'center', gap: space.sm},
  searchInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    fontSize: 15,
  },
  sortBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingVertical: 8,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortBtnText: {
    color: colors.primary,
    fontFamily: fontFamily.semibold,
    fontSize: 13,
  },
  chipsRow: {flexGrow: 0},
  chipsContent: {paddingVertical: 2},
  chip: {
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: space.sm,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  chipText: {
    color: colors.textSecondary,
    fontFamily: fontFamily.medium,
    fontSize: 13,
  },
  chipTextActive: {color: colors.textPrimary},
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingBottom: space.xl,
    maxHeight: '72%',
  },
  modalTitle: {
    color: colors.textPrimary,
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    padding: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  modalOption: {
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
  },
  modalOptionActive: {backgroundColor: colors.primaryMuted},
  modalOptionText: {
    color: colors.textPrimary,
    fontFamily: fontFamily.regular,
    fontSize: 15,
  },
  modalClose: {
    marginTop: space.sm,
    alignSelf: 'center',
    padding: space.md,
  },
  modalCloseText: {
    color: colors.textMuted,
    fontFamily: fontFamily.medium,
  },
});

function PoolsSummaryNavButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.headerBtn} hitSlop={12}>
      <Text style={styles.headerBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function PoolsListScreen() {
  const {t} = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<PoolsStackParamList>>();

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<PoolsListSortBy>('newest');
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    const tmr = setTimeout(() => setDebouncedSearch(searchInput.trim()), 380);
    return () => clearTimeout(tmr);
  }, [searchInput]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('Pools'),
      // eslint-disable-next-line react/no-unstable-nested-components -- React Navigation API
      headerRight: () => (
        <PoolsSummaryNavButton
          label={t('farming_summary_short')}
          onPress={() => navigation.navigate('MyPoolsSummary')}
        />
      ),
    });
  }, [navigation, t]);

  const categoriesQuery = useQuery({
    queryKey: ['pools', 'categories'],
    queryFn: fetchPoolCategories,
    staleTime: 60_000,
  });

  const categories = categoriesQuery.data?.categories ?? [];

  const listQuery = useInfiniteQuery({
    queryKey: ['pools', 'list', sortBy, category ?? '', debouncedSearch],
    queryFn: async ({pageParam}) =>
      fetchPoolsPage({
        limit: 20,
        offset: pageParam as number,
        sortBy,
        category,
        search: debouncedSearch || undefined,
      }),
    initialPageParam: 0,
    getNextPageParam: last =>
      last.nextOffset != null ? last.nextOffset : undefined,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isError,
    error,
    refetch,
    isRefetching,
  } = listQuery;

  const items = useMemo(
    () => data?.pages.flatMap(p => p.items) ?? [],
    [data?.pages],
  );

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage().catch(() => {});
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const renderItem = useCallback(
    ({item}: {item: SerializedPool}) => (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('PoolDetail', {poolId: item.id})
        }
        activeOpacity={0.85}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <MutedText numberOfLines={1}>{item.slug}</MutedText>
        {item.category ? (
          <MutedText numberOfLines={1} style={styles.cardCategory}>
            {item.category}
          </MutedText>
        ) : null}
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>{t('farming_spot')}</Text>
          <Text style={styles.cardValue} numberOfLines={1}>
            {item.spotPriceApprox}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>{t('farming_reserves')}</Text>
          <Text style={styles.cardValue} numberOfLines={1}>
            P {item.reservePoints} / T {item.reserveTokens}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [navigation, t],
  );

  const hasFilters = Boolean(debouncedSearch || category);
  const sortLabel = t(`farming_list_sort_${sortBy}`);

  const listHeader = useMemo(
    () => (
      <View style={styles.filterBlock}>
        <View style={styles.searchRow}>
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder={t('farming_list_search_placeholder')}
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setSortOpen(true)}
          activeOpacity={0.85}>
          <Text style={styles.sortBtnText}>
            {t('farming_list_sort')}: {sortLabel}
          </Text>
        </TouchableOpacity>
        {categories.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
            contentContainerStyle={styles.chipsContent}>
            <TouchableOpacity
              style={[styles.chip, !category && styles.chipActive]}
              onPress={() => setCategory(undefined)}>
              <Text
                style={[
                  styles.chipText,
                  !category && styles.chipTextActive,
                ]}>
                {t('farming_list_category_all')}
              </Text>
            </TouchableOpacity>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() =>
                  setCategory(prev => (prev === cat ? undefined : cat))
                }>
                <Text
                  style={[
                    styles.chipText,
                    category === cat && styles.chipTextActive,
                  ]}
                  numberOfLines={1}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
      </View>
    ),
    [categories, category, searchInput, sortLabel, t],
  );

  if (isPending) {
    return (
      <Screen>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (isError) {
    const msg = axios.isAxiosError(error)
      ? formatApiError(error)
      : t('Something went wrong');
    return (
      <Screen>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{msg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>{t('Retry')}</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={p => p.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 && styles.listEmpty,
        ]}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {hasFilters
              ? t('farming_list_empty_filtered')
              : t('farming_no_pools')}
          </Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        ListFooterComponent={
          hasNextPage ? (
            <View style={styles.footer}>
              {isFetchingNextPage ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={loadMore}
                  activeOpacity={0.85}>
                  <Text style={styles.loadMoreText}>{t('farming_load_more')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
      />
      <Modal
        visible={sortOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSortOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('farming_list_sort')}</Text>
            <ScrollView>
              {SORT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.modalOption,
                    sortBy === opt && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setSortBy(opt);
                    setSortOpen(false);
                  }}>
                  <Text style={styles.modalOptionText}>
                    {t(`farming_list_sort_${opt}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setSortOpen(false)}>
              <Text style={styles.modalCloseText}>{t('Close')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
