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
  bg: "#f3f7f4",
  ink: "#172e32",
  muted: "#49636a",
  accent: "#086646",
  glass: "#ffffff",
  line: "#d6e6e4",
};

export function StudentBackdrop({ children }: { children: ReactNode }) {
  return (
    <View style={styles.backdrop}>
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
  section: { gap: 14 },
  card: {
    backgroundColor: studentColors.glass,
    borderWidth: 1,
    borderColor: studentColors.line,
    borderRadius: 12,
    padding: 17,
    gap: 10,
  },
});
