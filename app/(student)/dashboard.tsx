import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useSession } from "../../src/session";
import {
  AssessmentFeed,
  RefreshAssessmentList,
  useAssessments,
} from "../../src/student-assessments";
import { StudentScreen, studentColors } from "../../src/student-ui";
import { H1, P } from "../../src/ui";

export default function Dashboard() {
  const { user } = useSession();
  const list = useAssessments();
  const now = Date.now();
  const upcoming = (list.data ?? [])
    .filter(
      (item) =>
        item.attempt?.status !== "FINISHED" && Date.parse(item.closesAt) > now,
    )
    .sort((a, b) => Date.parse(a.closesAt) - Date.parse(b.closesAt))
    .slice(0, 2);

  return (
    <StudentScreen animated>
      <View style={styles.hero}>
        <View pointerEvents="none" style={styles.heroGlow} />
        <Text style={styles.classTag}>Class {user?.className}</Text>
        <Text accessibilityRole="header" style={styles.heroTitle}>
          আমার ড্যাশবোর্ড
        </Text>
        <Text style={styles.heroName}>স্বাগতম, {user?.name}</Text>
      </View>
      <View style={styles.shortcuts}>
        <Shortcut
          type="exam"
          count={list.data?.filter((item) => item.kind === "EXAM").length}
        />
        <Shortcut
          type="homework"
          count={list.data?.filter((item) => item.kind === "HOMEWORK").length}
        />
      </View>
      <View style={styles.sectionHeading}>
        <H1>সামনের কাজ</H1>
        <P small>যেগুলোর সময়সীমা আগে শেষ হবে</P>
      </View>
      <AssessmentFeed
        list={list}
        items={upcoming}
        empty="এই মুহূর্তে কোনো আসন্ন কাজ নেই।"
      />
      <RefreshAssessmentList list={list} />
    </StudentScreen>
  );
}

function Shortcut({
  type,
  count,
}: {
  type: "exam" | "homework";
  count?: number;
}) {
  const exam = type === "exam";
  const title = exam ? "পরীক্ষা" : "হোমওয়ার্ক";
  const tint = exam ? studentColors.accent : "#574487";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        count === undefined ? title : `${title}, ${count} প্রকাশিত`
      }
      onPress={() => router.navigate(exam ? "/exams" : "/homeworks")}
      style={({ pressed }) => [
        styles.shortcut,
        pressed && { opacity: 0.78, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={styles.shortcutTop}>
        <View style={[styles.shortcutIcon, !exam && styles.homeworkIcon]}>
          <Ionicons
            name={exam ? "clipboard-outline" : "book-outline"}
            color={tint}
            size={22}
          />
        </View>
        <Ionicons name="arrow-forward-outline" size={17} color={tint} />
      </View>
      <Text style={styles.shortcutTitle}>{title}</Text>
      <P small>
        {count === undefined
          ? "সব দেখো"
          : `${count.toLocaleString("bn-BD")}টি প্রকাশিত`}
      </P>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: "#123f42",
    borderRadius: 26,
    padding: 22,
    gap: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#36706c",
  },
  heroGlow: {
    position: "absolute",
    right: -44,
    top: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 22,
    borderColor: "rgba(140,229,197,0.12)",
    backgroundColor: "rgba(140,229,197,0.08)",
  },
  classTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(214,249,237,0.14)",
    color: "#dcfff2",
    fontSize: 12,
    fontWeight: "700",
  },
  heroTitle: { fontSize: 29, color: "#fff", fontWeight: "800" },
  heroName: { fontSize: 16, color: "#d2f0e8" },
  shortcuts: { flexDirection: "row", gap: 12 },
  shortcut: {
    flex: 1,
    minWidth: 0,
    backgroundColor: studentColors.glass,
    borderWidth: 1,
    borderColor: studentColors.line,
    borderRadius: 21,
    padding: 13,
    gap: 5,
  },
  shortcutTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  shortcutIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#d8f1e8",
    alignItems: "center",
    justifyContent: "center",
  },
  homeworkIcon: { backgroundColor: "#ebe5fa" },
  shortcutTitle: { color: studentColors.ink, fontSize: 17, fontWeight: "700" },
  sectionHeading: { gap: 2, marginTop: 4 },
});
