import { router } from "expo-router";
import { score, useResults } from "../../src/results";
import { GlassCard, StudentScreen } from "../../src/student-ui";
import { Button, H1, P, errorMessage } from "../../src/ui";

export default function Results() {
  const rows = useResults();
  return <StudentScreen>
    <H1>Results</H1>
    {rows.isPending && <P>Loading results…</P>}
    {rows.error && <><P>{errorMessage(rows.error)}</P><Button title="Retry" secondary onPress={() => void rows.refetch()} /></>}
    {rows.data?.map((result) => <GlassCard key={result.id}>
      <P>{result.title}</P>
      <P small>{result.published ? score(result) + " / " + result.totalMax : result.status === "FINISHED" ? "Awaiting results" : "In progress"}</P>
      {result.published && <Button title="View result" secondary onPress={() => router.push({ pathname: "/result", params: { id: result.id } })} />}
    </GlassCard>)}
    {rows.data?.length === 0 && <P>No results yet.</P>}
  </StudentScreen>;
}
