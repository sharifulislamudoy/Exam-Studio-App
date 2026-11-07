import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from "react-native";
import { Screen } from "./ui";

export const studentColors = {
  bg: "#eef7f4",
  ink: "#172e32",
  muted: "#49636a",
  accent: "#08665b",
  glass: "rgba(255,255,255,0.78)",
  line: "#d6e6e4",
};

export function StudentBackdrop({ children }: { children: ReactNode }) {
  return (
    <View style={styles.backdrop}>
      <View pointerEvents="none" style={[styles.glow, styles.mint]} />
      <View pointerEvents="none" style={[styles.glow, styles.lilac]} />
      {children}
    </View>
  );
}

export function StudentScreen({
  children,
  animated = false,
}: {
  children: ReactNode;
  animated?: boolean;
}) {
  return (
    <Screen glass>
      {animated ? <Entrance>{children}</Entrance> : children}
    </Screen>
  );
}

function Entrance({ children }: { children: ReactNode }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState<boolean>();
  useEffect(() => {
    let active = true;
    let settingChanged = false;
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        settingChanged = true;
        setReduceMotion(enabled);
      },
    );
    void AccessibilityInfo.isReduceMotionEnabled().then(
      (enabled) => {
        if (active && !settingChanged) setReduceMotion(enabled);
      },
      () => {
        if (active && !settingChanged) setReduceMotion(true);
      },
    );
    return () => {
      active = false;
      sub.remove();
    };
  }, []);
  useEffect(() => {
    if (reduceMotion === undefined) return;
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.section,
        {
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.84, 1],
          }),
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function GlassCard({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: studentColors.bg },
  glow: { position: "absolute", borderRadius: 300 },
  mint: {
    width: 350,
    height: 350,
    top: -135,
    right: -90,
    backgroundColor: "#d0eee5",
  },
  lilac: {
    width: 430,
    height: 430,
    bottom: -255,
    left: -150,
    backgroundColor: "#e6e8fa",
  },
  section: { gap: 14 },
  card: {
    backgroundColor: studentColors.glass,
    borderWidth: 1,
    borderColor: studentColors.line,
    borderRadius: 21,
    padding: 17,
    gap: 10,
  },
});
