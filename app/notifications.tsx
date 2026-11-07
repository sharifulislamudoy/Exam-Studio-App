import { useState } from "react";
import { router } from "expo-router";
import { Text } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useInbox } from "../src/inbox";
import { pushAvailable, registerPush } from "../src/notifications";
import { useAssessments } from "../src/student-assessments";
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
  const assessments = useAssessments();
  const [notice, setNotice] = useState("");
  const [registering, setRegistering] = useState(false);
  return (
    <Screen>
      <H1>Notifications</H1>
      {pushAvailable && (
        <Button
          title={registering ? "Enabling…" : "Enable push notifications"}
          secondary
          disabled={registering}
          onPress={async () => {
            setRegistering(true);
            try {
              await registerPush();
              setNotice("Push notifications enabled.");
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
      {rows.data?.map((n) => {
        const assessment = assessments.data?.find((item) => item.id === n.assessmentId);
        const result = n.title === "Results published";
        return <Card key={n.id}>
          <P>{n.title}</P>
          <P>{n.body}</P>
          <P small>{date(n.createdAt)}</P>
          {(assessment || result || !n.readAt) && <Button
            title={result ? "View result" : assessment ? "Open assessment" : "Mark as read"}
            secondary
            onPress={() => {
              if (!n.readAt) void api("/notifications/" + n.id + "/read", "POST", {})
                .then(() => qc.invalidateQueries({ queryKey: ["notifications"] })).catch(() => {});
              if (result && n.assessmentId) router.push({ pathname: "/result", params: { assessmentId: n.assessmentId } });
              else if (assessment?.kind === "HOMEWORK") router.push({ pathname: "/homework", params: { id: assessment.id } });
              else if (assessment) router.push({ pathname: "/exam", params: { assessmentId: assessment.id, ...(assessment.attempt ? { attemptId: assessment.attempt.id } : {}) } });
            }}
          />}
        </Card>;
      })}
      {rows.data?.length === 0 && <P>No notifications yet.</P>}
    </Screen>
  );
}
