import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useBalances, type Balance } from '@/api/balances';
import { ApiError } from '@/api/client';
import { useToken } from '@/auth/token-context';
import { formatAmount, formatUsd, toCents } from '@/lib/amount';
import { colors } from '@/theme';

// Snapshots refresh every 15 s; older than this means our refreshes are failing.
const STALE_AFTER_MS = 60_000;

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatAge(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)} h ago`;
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'UNAUTHORIZED') return 'Your token is invalid or expired.';
    if (error.code === 'RATE_LIMITED') return 'Too many requests. Try again in a moment.';
    if (error.code === 'TIMEOUT' || error.code === 'NETWORK')
      return 'Could not reach the server. Check your connection.';
    return `Server error (${error.code}). Try again.`;
  }
  return 'Unexpected response from the server.';
}

function isUnauthorized(error: unknown) {
  return error instanceof ApiError && error.code === 'UNAUTHORIZED';
}

export default function Home() {
  const { clear } = useToken();
  const { data, error, isPending, isFetching, refetch } = useBalances();
  const now = useNow(5000);

  return (
    <>
      <Stack.Screen options={{ title: 'Payback' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {isPending ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading balances…</Text>
          </View>
        ) : !data ? (
          <ErrorBox error={error} onRetry={() => refetch()} onChangeToken={clear} />
        ) : (
          <>
            <View style={styles.totalCard}>
              <Text style={styles.muted}>Total payback</Text>
              <Text style={styles.total}>{formatUsd(toCents(data.usdTotal))}</Text>
              <Text style={styles.muted}>Available, pending and claiming, in USD</Text>
              <View style={styles.freshRow}>
                <Text
                  style={[
                    styles.fresh,
                    now - Date.parse(data.asOf) > STALE_AFTER_MS && styles.staleText,
                  ]}
                >
                  Updated {formatAge(now - Date.parse(data.asOf))}
                </Text>
                <Pressable
                  onPress={() => refetch()}
                  disabled={isFetching}
                  style={[styles.refresh, isFetching && styles.disabled]}
                  accessibilityRole="button"
                >
                  <Text style={styles.refreshText}>{isFetching ? 'Refreshing…' : 'Refresh'}</Text>
                </Pressable>
              </View>
            </View>

            {error && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  {errorMessage(error)} Showing the last balances we loaded.
                </Text>
                {isUnauthorized(error) && (
                  <Pressable onPress={clear} accessibilityRole="button">
                    <Text style={styles.link}>Change token</Text>
                  </Pressable>
                )}
              </View>
            )}

            {data.items.length === 0 ? (
              <Text style={styles.muted}>No balances yet.</Text>
            ) : (
              data.items.map((item) => <BalanceRow key={item.asset} item={item} />)
            )}
          </>
        )}

        <Pressable onPress={clear} style={styles.changeToken} accessibilityRole="button">
          <Text style={styles.link}>Change token</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

function BalanceRow({ item }: { item: Balance }) {
  return (
    <View style={styles.card}>
      <View style={styles.rowHeader}>
        <Text style={styles.asset}>{item.asset}</Text>
        <Text style={styles.usd}>{formatUsd(toCents(item.usdTotal))}</Text>
      </View>
      <Line label="Available" value={formatAmount(item.available, item.decimals)} strong />
      <Line label="Pending" value={formatAmount(item.pending, item.decimals)} />
      <Line label="Claiming" value={formatAmount(item.claiming, item.decimals)} />
    </View>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={[styles.lineValue, strong && styles.lineStrong]} selectable>
        {value}
      </Text>
    </View>
  );
}

function ErrorBox({
  error,
  onRetry,
  onChangeToken,
}: {
  error: unknown;
  onRetry: () => void;
  onChangeToken: () => void;
}) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{errorMessage(error)}</Text>
      {isUnauthorized(error) ? (
        <Pressable style={styles.button} onPress={onChangeToken} accessibilityRole="button">
          <Text style={styles.buttonText}>Change token</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.button} onPress={onRetry} accessibilityRole="button">
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  center: { alignItems: 'center', gap: 8, paddingVertical: 48 },
  muted: { color: colors.muted, fontSize: 14 },
  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 4,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  total: { fontSize: 32, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  freshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  fresh: { color: colors.muted, fontSize: 13 },
  staleText: { color: colors.warning, fontWeight: '600' },
  refresh: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  refreshText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 6,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  asset: { fontSize: 18, fontWeight: '700', color: colors.text },
  usd: { fontSize: 16, color: colors.text, fontVariant: ['tabular-nums'] },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  lineLabel: { color: colors.muted, fontSize: 14 },
  lineValue: {
    color: colors.text,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
    textAlign: 'right',
  },
  lineStrong: { fontWeight: '600' },
  warningBox: { backgroundColor: colors.warningBg, borderRadius: 10, padding: 12, gap: 6 },
  warningText: { color: colors.warning, fontSize: 14 },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 14, padding: 16, gap: 12 },
  errorText: { color: colors.danger, fontSize: 15 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  link: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  changeToken: { alignSelf: 'center', paddingVertical: 16 },
});
