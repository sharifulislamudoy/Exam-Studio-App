import { useState } from "react";
import { Alert, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AssessmentView } from "../src/contracts";
import { api } from "../src/api";
import { useSession } from "../src/session";
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
export default function Homework() {
  return (
    <Gate>
      <Content />
    </Gate>
  );
}
function Content() {
  const { user } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const qc = useQueryClient();
  const task = useQuery({
    queryKey: ["homework", id],
    queryFn: () =>
      api<AssessmentView & { expired: boolean }>(`/homework/${id}`),
  });
  async function done() {
    setBusy(true);
    try {
      await api(`/homework/${id}/done`, "POST", {});
      await qc.invalidateQueries({ queryKey: ["assessments"] });
      Alert.alert(
        "সংরক্ষণ হয়েছে",
        "খাতায় করা হয়েছে হিসেবে চিহ্নিত হয়েছে। শিক্ষক খাতা দেখে মূল্যায়ন করবেন।",
      );
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <H1>{task.data?.title || "হোমওয়ার্ক"}</H1>
      {(error || task.error) && (
        <Text style={styles.error}>{error || errorMessage(task.error)}</Text>
      )}
      {task.data && (
        <>
          <P>{task.data.instructions}</P>
          <P small>শেষ সময়: {date(task.data.closesAt)}</P>
          {task.data.questions?.map((q, i) => (
            <Card key={q.id}>
              <P>
                {i + 1}. {q.text}
              </P>
              <P small>
                {q.marks} নম্বর · {user?.name} · {user?.id}
              </P>
            </Card>
          ))}
          <P small>খাতায় লিখে রাখো। ছবি বা PDF আপলোড লাগবে না।</P>
          <Button
            title={task.data.expired ? "Deadline শেষ" : "খাতায় শেষ করেছি"}
            disabled={busy || task.data.expired}
            onPress={() =>
              Alert.alert(
                "নিশ্চিত করবে?",
                "খাতায় কাজ শেষ করে থাকলে নিশ্চিত করো।",
                [
                  { text: "বাতিল", style: "cancel" },
                  { text: "নিশ্চিত", onPress: () => void done() },
                ],
              )
            }
          />
        </>
      )}
    </Screen>
  );
}
