import { Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../src/api";
import {
  Gate,
  Screen,
  Card,
  H1,
  P,
  Button,
  styles,
  errorMessage,
} from "../src/ui";
type Result = {
  id: string;
  title: string;
  kind: string;
  status: string;
  published: boolean;
  totalMax: number;
  mcqScore?: number;
  writtenScore?: number;
  feedback?: string;
};
export default function Results() {
  return (
    <Gate>
      <Content />
    </Gate>
  );
}
function Content() {
  const rows = useQuery({
    queryKey: ["results"],
    queryFn: () => api<Result[]>("/results"),
    refetchInterval: 15000,
  });
  return (
    <Screen>
      <H1>আমার ফলাফল</H1>
      <Button title="Refresh" secondary onPress={() => void rows.refetch()} />
      {rows.error && (
        <Text style={styles.error}>{errorMessage(rows.error)}</Text>
      )}
      {rows.data?.map((r) => (
        <Card key={r.id}>
          <P>{r.title}</P>
          <P small>
            {r.kind} · {r.status}
          </P>
          {r.published ? (
            <>
              <H1>
                {(r.mcqScore || 0) + (r.writtenScore || 0)} / {r.totalMax}
              </H1>
              <P small>
                MCQ: {r.mcqScore} · লিখিত: {r.writtenScore}
              </P>
              {!!r.feedback && <P>{r.feedback}</P>}
            </>
          ) : (
            <P>মূল্যায়ন / ফলাফল প্রকাশের অপেক্ষায়।</P>
          )}
        </Card>
      ))}
      {rows.data?.length === 0 && <P>এখনও কোনো ফলাফল নেই।</P>}
    </Screen>
  );
}
