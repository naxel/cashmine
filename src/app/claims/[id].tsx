import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useClaim } from '@/api/claims';
import { colors } from '@/theme';

const STATUS_TEXT = {
  pending: 'Processing… usually done in about 20 seconds.',
  completed: 'Completed. The amount is on its way to your destination.',
  failed: 'Failed. The amount is back in your available balance.',
} as const;

export default function ClaimStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: claim, error, refetch } = useClaim(id);

  return (
    <View style={styles.content}>
      <Stack.Screen options={{ title: 'Claim status' }} />
      {!claim ? (
        error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Could not load the claim.</Text>
            <Pressable onPress={() => refetch()} accessibilityRole="button">
              <Text style={styles.link}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <ActivityIndicator />
        )
      ) : (
        <>
          <View style={[styles.badge, styles[claim.status]]}>
            {claim.status === 'pending' && <ActivityIndicator color={colors.warning} />}
            <Text style={styles.badgeText}>{STATUS_TEXT[claim.status]}</Text>
          </View>
          {claim.failureReason && (
            <Text style={styles.errorText}>Reason: {claim.failureReason}</Text>
          )}
          <View style={styles.card}>
            <Row label="Amount" value={`${claim.amount} ${claim.asset}`} />
            <Row label="Fee" value={`${claim.fee} ${claim.asset}`} />
            <Row label="You receive" value={`${claim.receiveAmount} ${claim.asset}`} strong />
            <Row label="Submitted" value={new Date(claim.createdAt).toLocaleString()} />
          </View>
          {error && claim.status === 'pending' && (
            <Text style={styles.muted}>Could not refresh the status; still trying.</Text>
          )}
        </>
      )}
      <Pressable
        style={styles.button}
        onPress={() => (router.canGoBack() ? router.dismissAll() : router.replace('/'))}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Back to balances</Text>
      </Pressable>
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.strong]} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  muted: { color: colors.muted, fontSize: 14 },
  badge: { flexDirection: 'row', gap: 10, alignItems: 'center', borderRadius: 12, padding: 14 },
  badgeText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  pending: { backgroundColor: colors.warningBg },
  completed: { backgroundColor: '#E5F5EA' },
  failed: { backgroundColor: colors.dangerBg },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { color: colors.muted, fontSize: 15 },
  rowValue: {
    color: colors.text,
    fontSize: 15,
    flexShrink: 1,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  strong: { fontWeight: '700' },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 10, padding: 12, gap: 6 },
  errorText: { color: colors.danger, fontSize: 14 },
  link: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
});
