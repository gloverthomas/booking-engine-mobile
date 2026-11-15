import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ApiRequestError } from "@/lib/api/client";
import { SessionProvider, useSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";

SplashScreen.preventAutoHideAsync();

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // A 4xx will not fix itself; only retry network trouble and server errors, once.
        retry: (count, error) =>
          count < 1 &&
          !(error instanceof ApiRequestError && error.status < 500),
      },
    },
  });
}

export default function RootLayout() {
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <StatusBar style="auto" />
        <Gate />
      </SessionProvider>
    </QueryClientProvider>
  );
}

function Gate() {
  const { state, retry } = useSession();

  if (state.status === "loading") return null; // the splash screen stays up
  SplashScreen.hide();

  if (state.status === "offline") {
    return (
      <Screen contentStyle={{ flexGrow: 1, justifyContent: "center" }}>
        <Text variant="title">Can&rsquo;t reach the server</Text>
        <Text tone="muted">
          Your sign-in is saved on this phone. Check your connection and try
          again.
        </Text>
        <Button title="Try again" onPress={retry} />
      </Screen>
    );
  }

  const signedIn = state.status === "signedIn";
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
