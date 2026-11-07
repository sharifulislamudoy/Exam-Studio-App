import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Redirect } from "expo-router";
import { useSession } from "./session";
export const colors = {
  ink: "#202722",
  muted: "#657069",
  line: "#dce3dd",
  bg: "#f7f8f7",
  accent: "#245c40",
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40, gap: 14 },
  title: { fontSize: 23, fontWeight: "700", color: colors.ink },
  h2: { fontSize: 18, fontWeight: "600", color: colors.ink },
  text: { fontSize: 15, color: colors.ink, lineHeight: 25 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 20 },
  card: {
    padding: 17,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    backgroundColor: "#fff",
    gap: 10,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 9, flexWrap: "wrap" },
  button: {
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  secondary: { backgroundColor: "#fff", borderColor: "#bac9be" },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5cd",
    borderRadius: 5,
    padding: 11,
    fontSize: 15,
    backgroundColor: "#fff",
    color: colors.ink,
  },
  error: { color: "#96352c", fontSize: 13, lineHeight: 22 },
  notice: {
    padding: 12,
    backgroundColor: "#edf3ee",
    borderWidth: 1,
    borderColor: "#d5e2d8",
    borderRadius: 5,
  },
  timer: {
    fontSize: 30,
    fontWeight: "700",
    color: colors.accent,
    fontVariant: ["tabular-nums"],
  },
  option: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  selected: { borderColor: colors.accent, backgroundColor: "#edf4ef" },
});
export function Screen({
  children,
  glass = false,
}: {
  children: ReactNode;
  glass?: boolean;
}) {
  return (
    <ScrollView
      style={[styles.screen, glass && { backgroundColor: "transparent" }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
export function H1({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}
export function P({
  children,
  small = false,
}: {
  children: ReactNode;
  small?: boolean;
}) {
  return <Text style={small ? styles.small : styles.text}>{children}</Text>;
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondary,
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[styles.buttonText, secondary && { color: colors.ink }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Input({ label, ...p }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <P small>{label}</P>
      <TextInput
        accessibilityLabel={label}
        {...p}
        style={[styles.input, p.style]}
      />
    </View>
  );
}
export function Busy() {
  return (
    <View
      style={[
        styles.screen,
        { justifyContent: "center", alignItems: "center" },
      ]}
    >
      <ActivityIndicator color={colors.accent} />
      <P>লোড হচ্ছে…</P>
    </View>
  );
}
export function Gate({ children }: { children: ReactNode }) {
  const { ready, user } = useSession();
  if (!ready) return <Busy />;
  if (!user || !user.profileComplete || user.status !== "APPROVED")
    return <Redirect href="/" />;
  return <>{children}</>;
}
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "কাজটি সম্পন্ন হয়নি। আবার চেষ্টা করো।";
export const date = (s: string) => new Date(s).toLocaleString("en-GB");
