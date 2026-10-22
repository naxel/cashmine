import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useToken } from '@/auth/token-context';
import { TokenScreen } from '@/components/token-screen';
import { colors } from '@/theme';

function TokenGate() {
  const { token } = useToken();
  if (token === undefined) return <ActivityIndicator style={styles.loading} />;
  if (token === null) return <TokenScreen />;
  return <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background } }} />;
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <View style={styles.page}>
        <View style={styles.root}>
          <TokenGate />
        </View>
      </View>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  loading: { flex: 1 },
});
