import { useEffect, useState } from "react";
import { AppState, StyleSheet, View, Text } from "react-native";
import { Stack, router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as ScreenCapture from "expo-screen-capture";
import { SessionProvider } from "../src/session";
import { listenForPush } from "../src/notifications";
export default function Layout() {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }),
  );
  const pathname = usePathname();
  const [hidden, setHidden] = useState(
    AppState.currentState === "background" ||
      AppState.currentState === "inactive",
  );
  const [capture, setCapture] = useState<"starting" | "ready" | "failed">(
    "starting",
  );
  const examBlocked = pathname === "/exam" && capture !== "ready";
  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync("exam-app")
      .then(() => setCapture("ready"))
      .catch(() => setCapture("failed"));
    const sub = AppState.addEventListener("change", (s) =>
      setHidden(s !== "active"),
    );
    const push = listenForPush(() => router.push("/notifications"));
    return () => {
      sub.remove();
      push?.remove();
      void ScreenCapture.allowScreenCaptureAsync("exam-app").catch(() => {});
    };
  }, []);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <SessionProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerTitleStyle: { fontSize: 17 },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: "#f7f8f7" },
            }}
          >
            <Stack.Screen
              name="index"
              options={{ title: "Exam Studio", headerBackVisible: false }}
            />
            <Stack.Screen
              name="(student)"
              options={{ headerShown: false }}
            />
            <Stack.Screen name="exam" options={{ title: "পরীক্ষা" }} />
            <Stack.Screen name="homework" options={{ title: "হোমওয়ার্ক" }} />
            <Stack.Screen
              name="notifications"
              options={{ title: "নোটিফিকেশন" }}
            />
          </Stack>
          {(hidden || examBlocked) && (
            <View
              pointerEvents="auto"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: "#fff",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 9999,
                },
              ]}
            >
              <Text>
                {examBlocked && capture === "failed"
                  ? "স্ক্রিন সুরক্ষা চালু হয়নি। অ্যাপ বন্ধ করে আবার খোলো।"
                  : "Exam Studio"}
              </Text>
              {!hidden && examBlocked && capture === "failed" && (
                <Text
                  accessibilityRole="button"
                  onPress={() => router.replace("/dashboard")}
                >
                  ড্যাশবোর্ডে ফিরে যাও
                </Text>
              )}
            </View>
          )}
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
