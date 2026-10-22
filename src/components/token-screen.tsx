import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useToken } from '@/auth/token-context';
import { colors } from '@/theme';

export function TokenScreen() {
  const { save } = useToken();
  const [value, setValue] = useState('');
  const trimmed = value.trim();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CashMine payback</Text>
      <Text style={styles.body}>
        Paste your API token. It is kept in this browser only and you can change it later.
      </Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={setValue}
        placeholder="API token"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        onSubmitEditing={() => trimmed && save(trimmed)}
        accessibilityLabel="API token"
      />
      <Pressable
        style={[styles.button, !trimmed && styles.buttonDisabled]}
        disabled={!trimmed}
        onPress={() => save(trimmed)}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  input: {
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: '600' },
});
