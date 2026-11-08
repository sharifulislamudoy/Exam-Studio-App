import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { AssessmentView } from "./contracts";
import { api } from "./api";
import { GlassCard, StudentScreen, studentColors } from "./student-ui";
import { Button, H1, P, date, errorMessage, styles as ui } from "./ui";

export function useAssessments() {
  return useQuery({
    queryKey: ["assessments"],
    queryFn: () => api<AssessmentView[]>("/assessments"),
    refetchInterval: 15000,
  });
}

export function AssessmentFeed({
  list,
  items,
  empty,
}: {
  list: ReturnType<typeof useAssessments>;
  items: AssessmentView[];
  empty: string;
}) {
  return (
    <>
      {list.isPending && <P>Loading…</P>}
      {list.error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {errorMessage(list.error)}
        </Text>
      )}
      {items.map((item) => (
        <AssessmentCard key={item.id} item={item} />
      ))}
      {list.isSuccess && items.length === 0 && Boolean(empty) && (
        <GlassCard>
          <P>{empty}</P>
        </GlassCard>
      )}
    </>
  );
}

export function AssessmentList({ kind }: { kind: AssessmentView["kind"] }) {
  const list = useAssessments();
  const exam = kind === "EXAM";
  const now = Date.now();
  const items = (list.data ?? []).filter((item) => item.kind === kind);
  const state = (item: AssessmentView) => item.attempt?.needsRevision ? "Needs revision"
    : item.attempt?.status === "FINISHED" ? (exam ? "Completed" : "Submitted")
    : Date.parse(item.closesAt) <= now ? "Closed"
    : Date.parse(item.opensAt) > now ? "Upcoming"
    : exam ? "Open now" : "To do";
  const groups = exam ? ["Open now", "Upcoming", "Completed", "Closed"]
    : ["Needs revision", "To do", "Upcoming", "Submitted", "Closed"];

  return (
    <StudentScreen animated>
      <H1>{exam ? "Exam" : "Homework"}</H1>
      <RefreshAssessmentList list={list} />
      <AssessmentFeed list={list} items={[]} empty={!items.length ? (exam ? "No exams yet." : "No homework yet.") : ""} />
      {groups.map((label) => {
        const group = items.filter((item) => state(item) === label);
        if (!group.length) return null;
        return <View key={label} style={{ gap: 10 }}>
          <Text style={ui.h2}>{label}</Text>
          {group.map((item) => <AssessmentCard key={item.id} item={item} />)}
        </View>;
      })}
    </StudentScreen>
  );
}

export function RefreshAssessmentList({
  list,
}: {
  list: ReturnType<typeof useAssessments>;
}) {
  return (
    <Button
      title={list.isFetching ? "Loading…" : "Refresh"}
      secondary
      disabled={list.isFetching}
      onPress={() => void list.refetch()}
    />
  );
}

function AssessmentCard({ item }: { item: AssessmentView }) {
  const exam = item.kind === "EXAM";
  const finished = exam && item.attempt?.status === "FINISHED";
  let title = "View details";
  if (!exam) title = item.attempt?.needsRevision ? "Needs revision" : item.attempt ? "View submission" : "View homework";
  else if (finished) title = "View submission";
  else if (item.attempt) title = "Resume exam";

  function open() {
    if (exam) {
      router.push({
        pathname: "/exam",
        params: {
          assessmentId: item.id,
          ...(item.attempt ? { attemptId: item.attempt.id } : {}),
        },
      });
    } else {
      router.push({ pathname: "/homework", params: { id: item.id } });
    }
  }

  return (
    <GlassCard>
      <View style={styles.heading}>
        <View style={[styles.badge, !exam && styles.homeworkBadge]}>
          <Ionicons
            name={exam ? "clipboard-outline" : "book-outline"}
            size={20}
            color={exam ? studentColors.accent : "#086646"}
          />
        </View>
        <View style={styles.headingText}>
          <Text style={ui.h2}>{item.title}</Text>
          <P small>
            {item.subject} · {item.totalMarks} marks
          </P>
        </View>
      </View>
      <View style={styles.schedule}>
        <Ionicons
          name="calendar-outline"
          size={16}
          color={studentColors.muted}
        />
        <Text style={[ui.small, styles.headingText]}>
          {`Start: ${date(item.opensAt)}\nEnd: ${date(item.closesAt)}`}
        </Text>
      </View>
      {exam && (
        <P small>
          {item.mode === "MCQ_CQ"
            ? `MCQ ${item.mcqSeconds / 60} + extra ${item.mcqExtraSeconds / 60} min → CQ ${item.cqSeconds / 60} min`
            : `Written ${item.writtenSeconds / 60} min`}
        </P>
      )}
      <Button title={title} onPress={open} />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "center", gap: 11 },
  headingText: { flex: 1 },
  badge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ddf1e9",
  },
  homeworkBadge: { backgroundColor: "#e7f3eb" },
  schedule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#edf5f3",
    borderRadius: 12,
    padding: 9,
  },
});
