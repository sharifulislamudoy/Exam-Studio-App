import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Redirect } from "expo-router";
import { api } from "../../../Exam-Studio-Required-Files/Exam-Studio-App/src/api";
import { CLASSES } from "../../../Exam-Studio-Required-Files/Exam-Studio-App/src/contracts";
import { useSession } from "../../../Exam-Studio-Required-Files/Exam-Studio-App/src/session";
import {
  Busy,
  Button,
  Card,
  H1,
  Input,
  P,
  Screen,
  errorMessage,
  styles,
} from "../../../Exam-Studio-Required-Files/Exam-Studio-App/src/ui";

export default function Entry() {
  const session = useSession();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [cls, setCls] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const accountName = session.user?.name;
  useEffect(() => {
    if (accountName) setName(accountName);
  }, [accountName]);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const classFields = (
    <>
      <Input label="Name" value={name} onChangeText={setName} maxLength={80} />
      <P small>Choose a class</P>
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
    </>
  );

  if (!session.ready) return <Busy />;
  if (session.user?.status === "APPROVED" && session.user.profileComplete)
    return <Redirect href="/dashboard" />;

  return (
    <Screen>
      <H1>Exam Studio</H1>
      <P>Exams and homework</P>
      {!!(error || session.error) && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error || session.error}
        </Text>
      )}
      {!session.user ? (
        <Card>
          <View style={styles.row}>
            <Button
              title="Sign in"
              secondary={mode !== "login"}
              disabled={busy}
              onPress={() => {
                setError("");
                setMode("login");
              }}
            />
            <Button
              title="New account"
              secondary={mode !== "signup"}
              disabled={busy}
              onPress={() => {
                setError("");
                setMode("signup");
              }}
            />
          </View>
          {mode === "signup" && classFields}
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            maxLength={254}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={128}
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
          />
          {mode === "signup" && <P small>Password must be at least 8 characters.</P>}
          <Button
            title={
              busy
                ? "Please wait…"
                : mode === "signup"
                  ? "Create an account"
                  : "Sign in"
            }
            disabled={
              busy ||
              !email.trim() ||
              !password ||
              (mode === "signup" &&
                (name.trim().length < 2 || !cls || password.length < 8))
            }
            onPress={() =>
              void run(async () => {
                await session.authenticate(mode, {
                  email,
                  password,
                  ...(mode === "signup" ? { name, className: cls } : {}),
                });
                setPassword("");
              })
            }
          />
        </Card>
      ) : !session.user.profileComplete ? (
        <Card>
          <P>Complete your profile.</P>
          {classFields}
          <Button
            title="Request approval"
            disabled={busy || name.trim().length < 2 || !cls}
            onPress={() =>
              void run(async () => {
                await api("/me/profile", "POST", { name, className: cls });
                await session.reload();
              })
            }
          />
        </Card>
      ) : (
        <Card>
          <P>
            {session.user.name} · Class {session.user.className}
          </P>
          <H1>
            {session.user.status === "REJECTED"
              ? "Approval denied"
              : "Awaiting approval"}
          </H1>
          <P>Exams and homework will appear after your teacher approves your account.</P>
          <Button
            title="Check again"
            disabled={busy}
            onPress={() => void run(session.reload)}
          />
        </Card>
      )}
      {session.user && (
        <Button
          secondary
          title="Sign out"
          disabled={busy}
          onPress={() => void run(session.logout)}
        />
      )}
    </Screen>
  );
}
