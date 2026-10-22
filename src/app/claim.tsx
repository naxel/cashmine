import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useBalances, type Balance } from '@/api/balances';
import { submitIntent, useClaimOptions } from '@/api/claims';
import { ApiError } from '@/api/client';
import { intentStore, myClaimsStore, type ClaimIntent } from '@/claims/store';
import { formatAmount } from '@/lib/amount';
import { checkClaim, normalizeAmountInput } from '@/lib/claim-rules';
import { colors } from '@/theme';

export default function ClaimScreen() {
  const params = useLocalSearchParams<{ asset?: string }>();
  // A saved intent means a claim whose result is unknown: only Retry with the same key is offered.
  const intent = intentStore.useValue();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(next: ClaimIntent) {
    if (submitting) return;
    // Persist before the POST so a reload or crash cannot lose the Idempotency-Key.
    intentStore.write(next);
    setSubmitting(true);
    setFormError(null);
    try {
      const claim = await submitIntent(next);
      router.replace({ pathname: '/claims/[id]', params: { id: claim.id } });
    } catch (e) {
      // Outcome unknown keeps the intent (UnknownOutcome renders); a definite error cleared it.
      if (!(e instanceof ApiError && e.outcomeUnknown)) {
        setFormError(e instanceof ApiError ? e.message : 'Unexpected response from the server.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Claim' }} />
      {submitting ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Submitting… confirming result</Text>
        </View>
      ) : intent ? (
        <UnknownOutcome intent={intent} onRetry={() => submit(intent)} />
      ) : (
        <ClaimForm initialAsset={params.asset} formError={formError} onConfirm={submit} />
      )}
    </>
  );
}

function UnknownOutcome({ intent, onRetry }: { intent: ClaimIntent; onRetry: () => void }) {
  return (
    <View style={styles.content}>
      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>We couldn&apos;t confirm your claim</Text>
        <Text style={styles.warningText}>
          Claim of {intent.amount} {intent.asset} may or may not have gone through. Retrying is
          safe: it will never create a second claim.
        </Text>
      </View>
      <Pressable style={styles.button} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.buttonText}>Retry</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={() => router.back()} accessibilityRole="button">
        <Text style={styles.link}>Back to balances</Text>
      </Pressable>
      <Text style={styles.muted}>New claims are paused until this one is confirmed.</Text>
    </View>
  );
}

function ClaimForm({
  initialAsset,
  formError,
  onConfirm,
}: {
  initialAsset?: string;
  formError: string | null;
  onConfirm: (intent: ClaimIntent) => void;
}) {
  const { data: balances, isPending } = useBalances();
  const myClaims = myClaimsStore.useValue();
  const busyAssets = new Set(myClaims.filter((c) => c.status === 'pending').map((c) => c.asset));

  const [asset, setAsset] = useState(initialAsset);
  const [input, setInput] = useState('');
  const [destinationId, setDestinationId] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const balance = balances?.items.find((b) => b.asset === asset);
  const options = useClaimOptions(asset);
  const destinations = options.data?.destinations ?? [];
  const destination =
    destinations.find((d) => d.id === destinationId) ??
    (destinations.length === 1 ? destinations[0] : undefined);

  const check =
    balance && options.data
      ? checkClaim(input, {
          decimals: balance.decimals,
          available: balance.available,
          minAmount: options.data.minAmount,
          fee: options.data.fee,
        })
      : null;

  if (isPending) return <ActivityIndicator style={styles.center} />;

  function review() {
    setShowErrors(true);
    if (check?.ok && destination) setConfirming(true);
  }

  function confirm() {
    if (!balance || !check?.ok || !destination) return;
    setConfirming(false);
    onConfirm({
      key: crypto.randomUUID(),
      asset: balance.asset,
      amount: formatAmount(check.amount, balance.decimals),
      destinationId: destination.id,
    });
  }

  const busy = !!asset && busyAssets.has(asset);
  const fieldError = check && !check.ok && (showErrors || input !== '') ? check.error : null;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Asset</Text>
      <View style={styles.chips}>
        {balances?.items.map((b) => (
          <AssetChip
            key={b.asset}
            balance={b}
            selected={b.asset === asset}
            onPress={() => {
              setAsset(b.asset);
              setInput('');
              setDestinationId(undefined);
              setShowErrors(false);
            }}
          />
        ))}
      </View>

      {!balance ? (
        <Text style={styles.muted}>Pick an asset to claim.</Text>
      ) : busy ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            A {balance.asset} claim is in progress. Wait until it completes before claiming again.
          </Text>
        </View>
      ) : options.isPending ? (
        <ActivityIndicator />
      ) : options.error || !options.data ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Could not load claim options.</Text>
          <Pressable onPress={() => options.refetch()} accessibilityRole="button">
            <Text style={styles.link}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={styles.muted}>
            Available {formatAmount(balance.available, balance.decimals)} {balance.asset} · minimum{' '}
            {options.data.minAmount} · fee {options.data.fee}
          </Text>

          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountRow}>
            <TextInput
              style={[styles.input, fieldError && styles.inputError]}
              value={input}
              onChangeText={(t) => setInput(normalizeAmountInput(t))}
              placeholder="0.0"
              placeholderTextColor={colors.muted}
              inputMode="decimal"
              keyboardType="decimal-pad"
              autoCorrect={false}
              accessibilityLabel={`Amount in ${balance.asset}`}
            />
            <Pressable
              style={styles.max}
              onPress={() => setInput(formatAmount(balance.available, balance.decimals))}
              accessibilityRole="button"
            >
              <Text style={styles.link}>Max</Text>
            </Pressable>
          </View>
          {fieldError && <Text style={styles.errorText}>{fieldError}</Text>}

          {destinations.length > 1 && (
            <>
              <Text style={styles.label}>Destination</Text>
              {destinations.map((d) => {
                const selected = destination?.id === d.id;
                return (
                  <Pressable
                    key={d.id}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => setDestinationId(d.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {d.label}
                    </Text>
                  </Pressable>
                );
              })}
              {showErrors && !destination && (
                <Text style={styles.errorText}>Choose a destination.</Text>
              )}
            </>
          )}
          {destinations.length === 0 && (
            <Text style={styles.errorText}>No destinations available for {balance.asset}.</Text>
          )}

          {check?.ok && (
            <View style={styles.summary}>
              <Row
                label="Fee"
                value={`${formatAmount(check.fee, balance.decimals)} ${balance.asset}`}
              />
              <Row
                label="You receive"
                value={`${formatAmount(check.receive, balance.decimals)} ${balance.asset}`}
                strong
              />
            </View>
          )}

          {formError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          )}

          <Pressable style={styles.button} onPress={review} accessibilityRole="button">
            <Text style={styles.buttonText}>Review claim</Text>
          </Pressable>
        </>
      )}

      <Modal
        visible={confirming}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirming(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Confirm claim</Text>
            {check?.ok && balance && (
              <>
                <Row
                  label="Amount"
                  value={`${formatAmount(check.amount, balance.decimals)} ${balance.asset}`}
                />
                <Row
                  label="Fee"
                  value={`${formatAmount(check.fee, balance.decimals)} ${balance.asset}`}
                />
                <Row
                  label="You receive"
                  value={`${formatAmount(check.receive, balance.decimals)} ${balance.asset}`}
                  strong
                />
                <Row label="To" value={destination?.label ?? ''} />
              </>
            )}
            <Pressable style={styles.button} onPress={confirm} accessibilityRole="button">
              <Text style={styles.buttonText}>Confirm</Text>
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={() => setConfirming(false)}
              accessibilityRole="button"
            >
              <Text style={styles.link}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function AssetChip({
  balance,
  selected,
  onPress,
}: {
  balance: Balance;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{balance.asset}</Text>
    </Pressable>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 48 },
  muted: { color: colors.muted, fontSize: 14 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  chipTextSelected: { color: colors.onPrimary },
  amountRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    fontSize: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: colors.surface,
    fontVariant: ['tabular-nums'],
  },
  inputError: { borderColor: colors.danger },
  max: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionText: { flex: 1, color: colors.text, fontSize: 15 },
  optionTextSelected: { fontWeight: '600' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  summary: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 6 },
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
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
  secondary: { alignItems: 'center', paddingVertical: 12 },
  link: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  errorBox: { backgroundColor: colors.dangerBg, borderRadius: 10, padding: 12, gap: 6 },
  errorText: { color: colors.danger, fontSize: 14 },
  warningBox: { backgroundColor: colors.warningBg, borderRadius: 10, padding: 12, gap: 6 },
  warningTitle: { color: colors.warning, fontSize: 16, fontWeight: '700' },
  warningText: { color: colors.warning, fontSize: 14, lineHeight: 20 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 10,
    width: '100%',
    maxWidth: 448,
    alignSelf: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
});
