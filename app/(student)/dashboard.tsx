import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { score, useResults, type StudentResult } from "../../src/results";
import type { AssessmentView } from "../../src/contracts";
import { useSession } from "../../src/session";
import { AssessmentFeed, useAssessments } from "../../src/student-assessments";
import { StudentScreen, studentColors } from "../../src/student-ui";
import { H1, P, date } from "../../src/ui";

export default function Dashboard() {
  const { user } = useSession();
  const list = useAssessments();
  const results = useResults();
  const latest = results.data?.find((result: StudentResult) => result.published);
  const now = Date.now();
  const assessments: AssessmentView[] = list.data ?? [];

  const upcoming = assessments
    .filter(
      (item) =>
        (item.attempt?.status !== "FINISHED" || item.attempt.needsRevision) &&
        Date.parse(item.closesAt) > now,
    )
    .sort((a, b) => Date.parse(a.closesAt) - Date.parse(b.closesAt));

  const openExams = upcoming.filter(
    (item) => item.kind === "EXAM" && Date.parse(item.opensAt) <= now,
  );
  const featured = openExams.find((item) => item.attempt) ?? openExams[0];

  return (
    <StudentScreen animated>
      <H1>Dashboard</H1>
      <P small>Class {user?.className} · {user?.name}</P>
      {featured && <View style={styles.hero}>
        <Text style={styles.meta}>{featured.attempt ? "In progress" : "Open now"}</Text>
        <Text style={styles.heading}>{featured.title}</Text>
        <Text style={styles.meta}>{featured.totalMarks} marks · Closes {date(featured.closesAt)}</Text>
        <Pressable accessibilityRole="button" style={styles.action} onPress={() => router.push({
          pathname: "/exam",
          params: { assessmentId: featured.id, ...(featured.attempt ? { attemptId: featured.attempt.id } : {}) },
        })}>
          <Text style={styles.actionLabel}>{featured.attempt ? "Resume exam" : "View exam"}</Text>
        </Pressable>
      </View>}
      <Text style={styles.section}>Up next</Text>
      <AssessmentFeed list={list} items={upcoming.filter((item) => item.id !== featured?.id).slice(0, 2)} empty={featured ? "No other upcoming tasks." : "No upcoming tasks."} />
      {latest && <Pressable accessibilityRole="button" style={styles.result} onPress={() => router.push({ pathname: "/result", params: { id: latest.id } })}>
        <Text style={styles.section}>Latest result</Text>
        <P small>{latest.title} · {score(latest)} / {latest.totalMax}</P>
      </Pressable>}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: studentColors.accent, borderRadius: 12, padding: 16, gap: 6 },
  heading: { color: "#fff", fontSize: 21, fontWeight: "700" },
  meta: { color: "#e3f6e9", fontSize: 13 },
  action: { alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: 8, backgroundColor: "#fff", marginTop: 6 },
  actionLabel: { color: studentColors.accent, fontWeight: "700" },
  section: { fontSize: 16, fontWeight: "700", color: studentColors.ink },
  result: { minHeight: 44, borderTopWidth: StyleSheet.hairlineWidth, borderColor: studentColors.line, paddingTop: 12, gap: 4 },
});
