import { useState } from "react";
import { Text } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useInbox } from "../src/inbox";
import { pushAvailable, registerPush } from "../src/notifications";
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
  const rows = useInbox();
  const [notice, setNotice] = useState("");
  const [registering, setRegistering] = useState(false);
  return (
    <Screen>
      <H1>নোটিফিকেশন</H1>
      <P small>Push notification মিস হলেও এখানে নোটিশ পাওয়া যাবে।</P>
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
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={styles.small}>
          {notice}
        </Text>
      )}
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
