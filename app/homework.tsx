import { useState } from "react";
import { Alert, Image, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import type { AssessmentView } from "../src/contracts";
import { api } from "../src/api";
import { Button, Card, Gate, H1, P, Screen, date, errorMessage, styles } from "../src/ui";

type HomeworkView = AssessmentView & {
  expired: boolean;
  submitted: boolean;
  revisionFeedback: string | null;
};

export default function Homework() {
  return <Gate><Content /></Gate>;
}

function Content() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [photo, setPhoto] = useState<{ uri: string; base64: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const qc = useQueryClient();
  const task = useQuery({
    queryKey: ["homework", id],
    queryFn: () => api<HomeworkView>("/homework/" + id),
    enabled: Boolean(id),
  });
  const data = task.data;
  const requiresPhoto = data?.homeworkMethod === "PHOTO";
  const needsRevision = data?.revisionFeedback != null;

  async function choosePhoto() {
    setError("");
    try {
      const selected = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.55,
        base64: true,
      });
      if (selected.canceled) return;
      const image = selected.assets[0];
      if (!image.base64 || image.base64.length > 1_398_104) {
        setError("Choose a smaller photo. The maximum upload size is 1 MB.");
        return;
      }
      setPhoto({ uri: image.uri, base64: image.base64 });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await api("/homework/" + id + "/done", "POST", requiresPhoto ? { photo: photo?.base64 } : {});
      setPhoto(undefined);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["assessments"] }),
        qc.invalidateQueries({ queryKey: ["homework", id] }),
        qc.invalidateQueries({ queryKey: ["results"] }),
      ]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <H1>{data?.title || "Homework"}</H1>
      {task.isPending && <P>Loading…</P>}
      {(error || task.error) && <Text accessibilityRole="alert" style={styles.error}>{error || errorMessage(task.error)}</Text>}
      {data && <>
        <P>{data.instructions}</P>
        <P small>Due {date(data.closesAt)}</P>
        {data.questions?.map((q, i) => <Card key={q.id}><P>{i + 1}. {q.text}</P><P small>{q.marks} marks</P></Card>)}
        {needsRevision && <Card><P>Needs revision</P><P small>{data.revisionFeedback}</P></Card>}
        {data.submitted && !needsRevision ? <Card>
          <P>Submitted</P>
          {!requiresPhoto && <P small>Bring your notebook to the next class.</P>}
        </Card> : data.expired ? <P>Submissions are closed.</P> : <>
          <P>{requiresPhoto ? "Attach a clear photo of your answers." : "Complete the work in your notebook and bring it to class."}</P>
          {requiresPhoto && <>
            {photo && <Image accessibilityLabel="Homework photo preview" source={{ uri: photo.uri }} style={{ height: 230, width: "100%", borderRadius: 10 }} resizeMode="contain" />}
            <Button title={photo ? "Replace photo" : "Choose photo"} secondary disabled={busy} onPress={() => void choosePhoto()} />
          </>}
          <Button title={busy ? "Submitting…" : needsRevision ? "Resubmit homework" : "Submit homework"}
            disabled={busy || (requiresPhoto && !photo)} onPress={() => Alert.alert(
              "Submit homework?",
              requiresPhoto ? "Make sure your answers are readable." : "Confirm that you finished the work in your notebook.",
              [{ text: "Cancel", style: "cancel" }, { text: "Submit", onPress: () => void submit() }],
            )} />
        </>}
      </>}
    </Screen>
  );
}
