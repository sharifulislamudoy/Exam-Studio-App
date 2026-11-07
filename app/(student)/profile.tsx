import { router } from "expo-router";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { CLASSES } from "../../src/contracts";
import { useSession } from "../../src/session";
import { api } from "../../src/api";
import { GlassCard, StudentScreen } from "../../src/student-ui";
import { H1, P, Button, styles, errorMessage } from "../../src/ui";
export default function Profile() {
  const { user, reload, logout } = useSession();
  const [cls, setCls] = useState(user?.className || "9");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <StudentScreen>
      <H1>My profile</H1>
      <GlassCard>
        <P>{user?.name}</P>
        <P small>{user?.email}</P>
        <P small>ID: {user?.id}</P>
        <P>Current class: {user?.className}</P>
        {user?.requestedClass && (
          <P small>
            Class {user.requestedClass} change is awaiting approval.
          </P>
        )}
      </GlassCard>
      <GlassCard>
        <P>Class change request</P>
        <View style={styles.row}>
          {CLASSES.map((c) => (
            <Button
              key={c}
              title={c}
              secondary={cls !== c}
              onPress={() => setCls(c)}
            />
          ))}
        </View>
        <Button
          title="Send request"
          disabled={busy || cls === user?.className}
          onPress={async () => {
            setBusy(true);
            try {
              await api("/me/class-request", "POST", { className: cls });
              await reload();
              setMessage(
                "Request sent. Your class stays the same until the teacher approves it.",
              );
            } catch (e) {
              setMessage(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        />
        {!!message && <Text style={styles.small}>{message}</Text>}
      </GlassCard>
      <Button title="Weekly routine" secondary onPress={() => router.push("/routine")} />
      <Button
        title="Sign out"
        secondary
        onPress={() =>
          Alert.alert("Sign out?", "The exam timer keeps running.", [
            { text: "Cancel", style: "cancel" },
            { text: "Sign out", onPress: () => void logout() },
          ])
        }
      />
    </StudentScreen>
  );
}
