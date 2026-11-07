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
      <H1>আমার প্রোফাইল</H1>
      <GlassCard>
        <P>{user?.name}</P>
        <P small>{user?.email}</P>
        <P small>ID: {user?.id}</P>
        <P>বর্তমান class: {user?.className}</P>
        {user?.requestedClass && (
          <P small>
            Class {user.requestedClass}-এ পরিবর্তন অনুমোদনের অপেক্ষায়।
          </P>
        )}
      </GlassCard>
      <GlassCard>
        <P>Class পরিবর্তনের আবেদন</P>
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
          title="আবেদন পাঠাও"
          disabled={busy || cls === user?.className}
          onPress={async () => {
            setBusy(true);
            try {
              await api("/me/class-request", "POST", { className: cls });
              await reload();
              setMessage(
                "আবেদন পাঠানো হয়েছে। অনুমোদনের আগে পুরোনো class-ই থাকবে।",
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
      <Button
        title="Logout"
        secondary
        onPress={() =>
          Alert.alert("Logout করবে?", "চলমান পরীক্ষার timer থামবে না।", [
            { text: "বাতিল", style: "cancel" },
            { text: "Logout", onPress: () => void logout() },
          ])
        }
      />
    </StudentScreen>
  );
}
