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
      {list.isPending && <P>লোড হচ্ছে…</P>}
      {list.error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {errorMessage(list.error)}
        </Text>
      )}
      {items.map((item) => (
        <AssessmentCard key={item.id} item={item} />
      ))}
      {list.isSuccess && items.length === 0 && (
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
  const items = list.data?.filter((item) => item.kind === kind) ?? [];

  return (
    <StudentScreen animated>
      <H1>{exam ? "পরীক্ষা" : "হোমওয়ার্ক"}</H1>
      <P small>
        {exam
          ? "প্রকাশিত পরীক্ষা ও শুরুর সময় দেখো।"
          : "প্রকাশিত বাড়ির কাজ ও জমার সময় দেখো।"}
      </P>
      <RefreshAssessmentList list={list} />
      <AssessmentFeed
        list={list}
        items={items}
        empty={
          exam
            ? "এই মুহূর্তে কোনো পরীক্ষা নেই।"
            : "এই মুহূর্তে কোনো হোমওয়ার্ক নেই।"
        }
      />
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
      title={list.isFetching ? "লোড হচ্ছে…" : "Refresh"}
      secondary
      disabled={list.isFetching}
      onPress={() => void list.refetch()}
    />
  );
}

function AssessmentCard({ item }: { item: AssessmentView }) {
  const exam = item.kind === "EXAM";
  const finished = exam && item.attempt?.status === "FINISHED";
  let title = "বিস্তারিত / শুরু";
  if (!exam) title = "Homework দেখো";
  else if (finished) title = "পরীক্ষা শেষ";
  else if (item.attempt) title = "পরীক্ষায় ফিরে যাও";

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
            color={exam ? studentColors.accent : "#574487"}
          />
        </View>
        <View style={styles.headingText}>
          <Text style={ui.h2}>{item.title}</Text>
          <P small>
            {item.subject} · {item.totalMarks} নম্বর
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
          {`শুরু: ${date(item.opensAt)}\nশেষ: ${date(item.closesAt)}`}
        </Text>
      </View>
      {exam && (
        <P small>
          {item.mode === "MCQ_CQ"
            ? `MCQ ${item.mcqSeconds / 60} + extra ${item.mcqExtraSeconds / 60} মিনিট → CQ ${item.cqSeconds / 60} মিনিট`
            : `লিখিত ${item.writtenSeconds / 60} মিনিট`}
        </P>
      )}
      {item.attempt && <P small>অবস্থা: {item.attempt.status}</P>}
      <Button title={title} disabled={finished} onPress={open} />
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
  homeworkBadge: { backgroundColor: "#ebe5fa" },
  schedule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#edf5f3",
    borderRadius: 12,
    padding: 9,
  },
});
