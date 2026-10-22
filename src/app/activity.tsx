import { Stack } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useActivity, type ActivityItem } from '@/api/activity';
import { useBalances } from '@/api/balances';
import { formatAmount, parseAmount } from '@/lib/amount';
import { colors } from '@/theme';

const TYPE_LABEL = { accrual: 'Payback', reversal: 'Reversal', claim: 'Claim' } as const;

// Formats a signed amount with the asset's decimals when known; otherwise shows it as sent.
function formatSigned(amount: string, decimals: number | undefined) {
  const negative = amount.startsWith('-');
  const abs = negative ? amount.slice(1) : amount;
  const minor = decimals === undefined ? null : parseAmount(abs, decimals);
  const text = minor === null ? abs : formatAmount(minor, decimals!);
  return `${negative ? '−' : '+'}${text}`;
}

export default function ActivityScreen() {
  const { data, error, isPending, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useActivity();
  const { data: balances } = useBalances();
  const decimalsOf = (asset: string) => balances?.items.find((b) => b.asset === asset)?.decimals;
  const items = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <View style={styles.page}>
      <Stack.Screen options={{ title: 'Activity' }} />
      {isPending ? (
        <ActivityIndicator style={styles.center} />
      ) : !data ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Could not load activity.</Text>
          <Pressable onPress={() => refetch()} accessibilityRole="button">
            <Text style={styles.link}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.content}
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Row item={item} amount={formatSigned(item.amount, decimalsOf(item.asset))} />
          )}
          ListEmptyComponent={<Text style={styles.muted}>No activity yet.</Text>}
          ListFooterComponent={
            <View style={styles.footer}>
              {error && <Text style={styles.errorText}>Could not load more.</Text>}
              {hasNextPage && (
                <Pressable
                  style={[styles.button, isFetchingNextPage && styles.disabled]}
                  disabled={isFetchingNextPage}
                  onPress={() => fetchNextPage()}
                  accessibilityRole="button"
                >
                  <Text style={styles.buttonText}>
                    {isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

function Row({ item, amount }: { item: ActivityItem; amount: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.type}>
          {TYPE_LABEL[item.type]}
          {item.exchange ? ` · ${item.exchange}` : ''}
        </Text>
        <Text style={styles.muted}>
          {new Date(item.createdAt).toLocaleString()} · {item.status}
        </Text>
      </View>
      <Text
        style={[
          styles.amount,
          // A failed claim's amount went back to available: show it as void, not as a debit.
          item.type === 'claim' && item.status === 'failed'
            ? styles.voided
            : item.amount.startsWith('-') && styles.negative,
        ]}
        selectable
      >
        {amount} {item.asset}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  list: { flex: 1 },
  content: { padding: 16, gap: 8 },
  center: { padding: 48 },
  muted: { color: colors.muted, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  rowMain: { flex: 1, gap: 2 },
  type: { color: colors.text, fontSize: 15, fontWeight: '600' },
  amount: {
    color: colors.text,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
    textAlign: 'right',
  },
  negative: { color: colors.danger },
  voided: { color: colors.muted, textDecorationLine: 'line-through' },
  footer: { gap: 8, paddingVertical: 8 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  errorBox: { margin: 16, backgroundColor: colors.dangerBg, borderRadius: 10, padding: 12, gap: 6 },
  errorText: { color: colors.danger, fontSize: 14 },
  link: { color: colors.primary, fontSize: 15, fontWeight: '600' },
});
