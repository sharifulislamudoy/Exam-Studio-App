import { useLocalSearchParams } from "expo-router";
import { score, useResults } from "../src/results";
import { Button, Card, Gate, H1, P, Screen, errorMessage } from "../src/ui";

function Content() {
  const { id, assessmentId } = useLocalSearchParams<{ id?: string; assessmentId?: string }>();
  const rows = useResults();
  const result = rows.data?.find((item) => id ? item.id === id : item.assessmentId === assessmentId);
  return <Screen>
    <H1>{result?.title ?? "Result"}</H1>
    {rows.isPending && <P>Loading result…</P>}
    {rows.error && <><P>{errorMessage(rows.error)}</P><Button title="Retry" secondary onPress={() => void rows.refetch()} /></>}
    {rows.data && !result?.published && <P>This result is not available yet.</P>}
    {result?.published && <Card>
      <P small>{[result.subject, result.chapter].filter(Boolean).join(" · ")}</P>
      <H1>{score(result)} / {result.totalMax}</H1>
      <P>MCQ: {result.mcqScore ?? 0} · Written: {result.writtenScore ?? 0}</P>
      {!!result.feedback && <><P small>Teacher feedback</P><P>{result.feedback}</P></>}
    </Card>}
  </Screen>;
}

export default function Result() {
  return <Gate><Content /></Gate>;
}
