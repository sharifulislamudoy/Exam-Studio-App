import { Text } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { InboxView } from "../src/contracts";
import { api } from "../src/api";
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
export default function Notifications() {
  return (
    <Gate>
      <Content />
    </Gate>
  );
}
function Content() {
  const qc = useQueryClient();
  const rows = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<InboxView[]>("/notifications"),
    refetchInterval: 15000,
  });
  return (
    <Screen>
      <H1>নোটিফিকেশন</H1>
      <P small>Push notification মিস হলেও এখানে নোটিশ পাওয়া যাবে।</P>
      <Button title="Refresh" secondary onPress={() => void rows.refetch()} />
      {rows.error && (
        <Text style={styles.error}>{errorMessage(rows.error)}</Text>
      )}
      {rows.data?.map((n) => (
        <Card key={n.id}>
          <P>{n.title}</P>
          <P>{n.body}</P>
          <P small>{date(n.createdAt)}</P>
          {!n.readAt && (
            <Button
              title="পড়েছি"
              secondary
              onPress={async () => {
                try {
                  await api(`/notifications/${n.id}/read`, "POST", {});
                  await qc.invalidateQueries({ queryKey: ["notifications"] });
                } catch {}
              }}
            />
          )}
        </Card>
      ))}
      {rows.data?.length === 0 && <P>কোনো নোটিশ নেই।</P>}
    </Screen>
  );
}
