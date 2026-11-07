import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useInbox } from "../../src/inbox";
import { Gate } from "../../src/ui";
import { StudentBackdrop, studentColors } from "../../src/student-ui";

type Icon = ComponentProps<typeof Ionicons>["name"];

const tabs = [
  { name: "dashboard", title: "Home", icon: "home-outline" },
  { name: "exams", title: "Exams", icon: "clipboard-outline" },
  { name: "results", title: "Result", icon: "bar-chart-outline" },
  { name: "homeworks", title: "Homework", icon: "book-outline" },
  { name: "profile", title: "Profile", icon: "person-outline" },
] as const satisfies ReadonlyArray<{ name: string; title: string; icon: Icon }>;

export default function StudentLayout() {
  return (
    <Gate>
      <StudentBackdrop>
        <StudentHeader />
        <Tabs
          initialRouteName="dashboard"
          backBehavior="initialRoute"
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: "transparent" },
            tabBarActiveTintColor: studentColors.accent,
            tabBarInactiveTintColor: studentColors.muted,
            tabBarLabelPosition: "below-icon",
            tabBarLabelStyle: styles.tabLabel,
            tabBarStyle: styles.tabBar,
            tabBarHideOnKeyboard: true,
          }}
        >
          {tabs.map(({ name, title, icon }) => (
            <Tabs.Screen
              key={name}
              name={name}
              options={{
                title,
                tabBarIcon: ({ color, focused }) => (
                  <View style={[styles.tabIcon, focused && styles.activeIcon]}>
                    <Ionicons name={icon} size={20} color={color} />
                  </View>
                ),
              }}
            />
          ))}
        </Tabs>
      </StudentBackdrop>
    </Gate>
  );
}

function StudentHeader() {
  const inbox = useInbox();
  const unread = inbox.data?.filter((notice) => !notice.readAt).length ?? 0;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.brand} accessibilityLabel="Exam Studio">
          <View style={styles.mark}>
            <Ionicons name="school" size={22} color="#fff" />
          </View>
          <Text style={styles.wordmark}>Exam Studio</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            unread ? `Notifications, ${unread} unread` : "Notifications"
          }
          onPress={() => router.push("/notifications")}
          style={({ pressed }) => [styles.bell, pressed && { opacity: 0.65 }]}
        >
          <Ionicons
            name="notifications-outline"
            size={23}
            color={studentColors.ink}
          />
          {unread > 0 && <View style={styles.unreadDot} />}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: studentColors.glass,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: studentColors.line,
  },
  headerContent: {
    minHeight: 64,
    paddingVertical: 8,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  mark: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: studentColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  wordmark: {
    color: studentColors.ink,
    fontSize: 18,
    fontWeight: "800",
    flexShrink: 1,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: studentColors.line,
  },
  unreadDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#c74e37",
    borderWidth: 1,
    borderColor: "#fff",
  },
  tabBar: {
    backgroundColor: "rgba(255,255,255,0.93)",
    borderTopColor: studentColors.line,
    elevation: 0,
  },
  tabLabel: { fontSize: 10, fontWeight: "700" },
  tabIcon: {
    width: 40,
    height: 25,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  activeIcon: { backgroundColor: "#d8f1e8" },
});
