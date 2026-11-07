import { useEffect, useRef, useState, type ComponentProps } from "react";
import { AccessibilityInfo, Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../../src/session";
import { useInbox } from "../../src/inbox";
import { Button, Gate, H1, P } from "../../src/ui";
import { StudentBackdrop, studentColors } from "../../src/student-ui";

type Icon = ComponentProps<typeof Ionicons>["name"];

const tabs = [
  { name: "dashboard", title: "Home", icon: "home-outline" },
  { name: "exams", title: "Exams", icon: "clipboard-outline" },
  { name: "homeworks", title: "Homework", icon: "book-outline" },
  { name: "results", title: "Results", icon: "bar-chart-outline" },
  { name: "profile", title: "Profile", icon: "person-outline" },
] as const satisfies ReadonlyArray<{ name: string; title: string; icon: Icon }>;

export default function StudentLayout() {
  const [profile, setProfile] = useState(false);
  return (
    <Gate>
      <StudentBackdrop>
        <StudentHeader />
        <ProfileDrawer open={profile} close={() => setProfile(false)} />
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
              listeners={name === "profile" ? { tabPress: (event) => { event.preventDefault(); setProfile(true); } } : undefined}
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

function ProfileDrawer({ open, close }: { open: boolean; close: () => void }) {
  const { user } = useSession();
  const slide = useRef(new Animated.Value(390)).current;
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    slide.setValue(390);
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) slide.setValue(0);
      else Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    }).catch(() => { if (!cancelled) slide.setValue(0); });
    return () => { cancelled = true; slide.stopAnimation(); };
  }, [open, slide]);
  return <Modal visible={open} transparent animationType="none" onRequestClose={close}>
    <View style={styles.drawerOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close profile" />
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slide }] }]}>
        <SafeAreaView style={styles.drawerContent} accessibilityViewIsModal>
        <Button title="Close" secondary onPress={close} />
        <H1>{user?.name}</H1>
        <P small>Class {user?.className} · {user?.email}</P>
        <Button title="Account settings" secondary onPress={() => { close(); router.navigate("/profile"); }} />
        <Button title="Weekly routine" secondary onPress={() => { close(); router.push("/routine"); }} />
        </SafeAreaView>
      </Animated.View>
    </View>
  </Modal>;
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
  drawerOverlay: { flex: 1, flexDirection: "row", justifyContent: "flex-end", backgroundColor: "#10241c66" },
  drawer: { width: "82%", maxWidth: 390, backgroundColor: "#fff" },
  drawerContent: { flex: 1, gap: 12, padding: 16 },
  header: {
    backgroundColor: studentColors.glass,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: studentColors.line,
  },
  headerContent: {
    minHeight: 56,
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
    backgroundColor: "#fff",
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
