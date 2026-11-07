import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { AssessmentView } from "../src/contracts";
import { api } from "../src/api";
import { useSession } from "../src/session";
import { pushAvailable, registerPush } from "../src/notifications";
import {
  Gate,
  Screen,
  Card,
  H1,
  P,
  Button,
  styles,
  date,
  errorMessage,
} from "../src/ui";
export default function Dashboard() {
  return (
    <Gate>
      <Content />
    </Gate>
  );
}
function Content() {
  const { user } = useSession();
  const [kind, setKind] = useState<"EXAM" | "HOMEWORK">("EXAM");
  const [notice, setNotice] = useState("");
  const [registering, setRegistering] = useState(false);
  const list = useQuery({
    queryKey: ["assessments"],
    queryFn: () => api<AssessmentView[]>("/assessments"),
    refetchInterval: 15000,
  });
  return (
    <Screen>
      <H1>{user?.name}</H1>
      <P small>
        Class {user?.className} · ID: {user?.id}
      </P>
      <View style={styles.row}>
        <Button
          title="ফলাফল"
          secondary
          onPress={() => router.push("/results")}
        />
        <Button
          title="নোটিফিকেশন"
          secondary
          onPress={() => router.push("/notifications")}
        />
        <Button
          title="প্রোফাইল"
          secondary
          onPress={() => router.push("/profile")}
        />
      </View>
      {pushAvailable && (
        <Button
          title={registering ? "চালু হচ্ছে…" : "Notification চালু করো"}
          secondary
          disabled={registering}
          onPress={async () => {
            setRegistering(true);
            try {
              await registerPush();
              setNotice("Notification চালু হয়েছে।");
            } catch (e) {
              setNotice(errorMessage(e));
            } finally {
              setRegistering(false);
            }
          }}
        />
      )}
      {notice && <Text style={styles.small}>{notice}</Text>}
      <View style={styles.row}>
        <Button
          title="পরীক্ষা"
          secondary={kind !== "EXAM"}
          onPress={() => setKind("EXAM")}
        />
        <Button
          title="বাড়ির কাজ"
          secondary={kind !== "HOMEWORK"}
          onPress={() => setKind("HOMEWORK")}
        />
        <Button title="Refresh" secondary onPress={() => void list.refetch()} />
      </View>
      {list.isPending && <P>লোড হচ্ছে…</P>}
      {list.error && (
        <Text style={styles.error}>{errorMessage(list.error)}</Text>
      )}
      {list.data
        ?.filter((e) => e.kind === kind)
        .map((e) => (
          <Card key={e.id}>
            <Text style={styles.h2}>{e.title}</Text>
            <P small>
              {e.subject} · {e.totalMarks} নম্বর
            </P>
            <P small>
              শুরু: {date(e.opensAt)}
              {"\n"}শেষ: {date(e.closesAt)}
            </P>
            {e.kind === "EXAM" && (
              <P small>
                {e.mode === "MCQ_CQ"
                  ? `MCQ ${e.mcqSeconds / 60} + extra ${e.mcqExtraSeconds / 60} মিনিট → CQ ${e.cqSeconds / 60} মিনিট`
                  : `লিখিত ${e.writtenSeconds / 60} মিনিট`}
              </P>
            )}
            {e.attempt && <P small>অবস্থা: {e.attempt.status}</P>}
            <Button
              title={
                e.kind === "HOMEWORK"
                  ? "Homework দেখো"
                  : e.attempt?.status === "FINISHED"
                    ? "পরীক্ষা শেষ"
                    : e.attempt
                      ? "পরীক্ষায় ফিরে যাও"
                      : "বিস্তারিত / শুরু"
              }
              disabled={e.kind === "EXAM" && e.attempt?.status === "FINISHED"}
              onPress={() =>
                router.push(
                  e.kind === "HOMEWORK"
                    ? { pathname: "/homework", params: { id: e.id } }
                    : {
                        pathname: "/exam",
                        params: {
                          assessmentId: e.id,
                          ...(e.attempt ? { attemptId: e.attempt.id } : {}),
                        },
                      },
                )
              }
            />
          </Card>
        ))}
      {list.data?.filter((e) => e.kind === kind).length === 0 && (
        <Card>
          <P>এই মুহূর্তে কোনো কাজ নেই।</P>
        </Card>
      )}
    </Screen>
  );
}
