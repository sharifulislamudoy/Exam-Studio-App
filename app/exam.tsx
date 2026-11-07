import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  canPauseForClass,
  formatTime,
  type AssessmentView,
  type AttemptView,
} from "../../../Exam-Studio-Required-Files/Exam-Studio-App/src/contracts";
import { api } from "../../../Exam-Studio-Required-Files/Exam-Studio-App/src/api";
import { useSession } from "../../../Exam-Studio-Required-Files/Exam-Studio-App/src/session";
import {
  queueAnswer,
  pendingAnswers,
  markSaved,
  discardPending,
} from "../src/storage";
import {
  Gate,
  Screen,
  Card,
  H1,
  P,
  Button,
  styles,
  errorMessage,
  date,
} from "../../../Exam-Studio-Required-Files/Exam-Studio-App/src/ui";
export default function Exam() {
  return (
    <Gate>
      <ExamContent />
    </Gate>
  );
}
function ExamContent() {
  const params = useLocalSearchParams<{
    assessmentId: string;
    attemptId?: string;
  }>();
  const { user } = useSession();
  const [attemptId, setAttemptId] = useState(params.attemptId || "");
  const [view, setView] = useState<AttemptView | null>(null);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [receivedAt, setReceivedAt] = useState(0);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(true);
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const [error, setError] = useState("");
  const [syncState, setSyncState] = useState("");
  const stamp = useRef(0);
  const fetching = useRef(false);
  const flushing = useRef<Promise<void> | null>(null);
  const choosing = useRef<Promise<unknown>>(Promise.resolve());
  const rejected = useRef(false);
  const list = useQuery({
    queryKey: ["assessments"],
    queryFn: () => api<AssessmentView[]>("/assessments"),
  });
  const exam = list.data?.find((e) => e.id === params.assessmentId);
  const adopt = useCallback(async (v: AttemptView) => {
    const server = Date.parse(v.serverNow);
    if (server < stamp.current) return;
    stamp.current = server;
    setView(v);
    setReceivedAt(performance.now());
    let choices = { ...v.answers };
    if (v.status === "ACTIVE" && v.phase === "MCQ") {
      for (const a of await pendingAnswers(v.id))
        choices[a.question] = a.selected;
    } else await discardPending(v.id);
    setSelected(choices);
    setLocked(false);
  }, []);
  const flush = useCallback(async () => {
    if (!attemptId) return;
    if (flushing.current) return flushing.current;
    flushing.current = (async () => {
      await choosing.current;
      for (let round = 0; round < 30; round++) {
        const queued = await pendingAnswers(attemptId);
        if (!queued.length) {
          setSyncState("All answers saved");
          return;
        }
        setSyncState("Saving answers…");
        for (const a of queued) {
          const result = await api<{
            accepted: boolean;
            attempt?: AttemptView;
          }>(`/attempts/${attemptId}/answer`, "POST", {
            questionId: a.question,
            selectedIndex: a.selected,
            revision: a.revision,
          });
          if (!result.accepted) {
            await discardPending(attemptId);
            if (result.attempt) await adopt(result.attempt);
            setSyncState("MCQ Time is up. Answers received after the deadline were rejected.");
            if (!rejected.current) {
              rejected.current = true;
              Alert.alert(
                "Time is up",
                "Answers received after the deadline were rejected.",
              );
            }
            return;
          }
          await markSaved(a);
        }
      }
      throw new Error("Answers are still syncing. Try again.");
    })().finally(() => {
      flushing.current = null;
    });
    return flushing.current;
  }, [attemptId, adopt]);
  const refresh = useCallback(
    async (hide = false) => {
      if (!attemptId || fetching.current) return;
      fetching.current = true;
      if (hide) setLocked(true);
      try {
        const v = await api<AttemptView>(`/attempts/${attemptId}`);
        await adopt(v);
        setError("");
        if (v.status === "ACTIVE" && v.phase === "MCQ") await flush();
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        fetching.current = false;
      }
    },
    [attemptId, adopt, flush],
  );
  useFocusEffect(
    useCallback(() => {
      void refresh(true);
      return () => setLocked(true);
    }, [refresh]),
  );
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 250);
    const poll = setInterval(() => void refresh(), 10000);
    const sub = AppState.addEventListener("change", (s) => {
      setForeground(s === "active");
      setLocked(true);
      if (s === "active") void refresh(true);
    });
    return () => {
      clearInterval(timer);
      clearInterval(poll);
      sub.remove();
    };
  }, [refresh]);
  const elapsed = receivedAt ? (performance.now() - receivedAt) / 1000 : 0;
  const remaining = Math.max(
    0,
    (view?.remainingSeconds || 0) - (view?.status === "ACTIVE" ? elapsed : 0),
  );
  const mainRemaining = Math.max(
    0,
    (view?.mainRemainingSeconds || 0) - elapsed,
  );
  const deadlineRemaining = view
    ? Math.max(
        0,
        (Date.parse(view.deadline) - Date.parse(view.serverNow)) / 1000 -
          elapsed,
      )
    : 0;
  const pauseRemaining = view
    ? Math.max(
        0,
        Math.min(view.pauseRemainingSeconds - elapsed, deadlineRemaining),
      )
    : 0;
  useEffect(() => {
    if (
      view &&
      ((view.status === "ACTIVE" && remaining <= 0) ||
        (view.status === "PAUSED" && pauseRemaining <= 0))
    )
      void refresh();
  }, [
    view?.serverNow,
    Math.ceil(remaining),
    Math.ceil(pauseRemaining),
    refresh,
  ]);
  async function start() {
    setBusy(true);
    setError("");
    try {
      const v = await api<AttemptView>(
        `/assessments/${params.assessmentId}/start`,
        "POST",
        {},
      );
      setAttemptId(v.id);
      await adopt(v);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function action(action: "PAUSE" | "RESUME" | "SUBMIT_MCQ" | "FINISH") {
    if (!view) return;
    setBusy(true);
    setError("");
    try {
      if (view.phase === "MCQ" && view.status === "ACTIVE") await flush();
      const v = await api<AttemptView>(`/attempts/${view.id}/action`, "POST", {
        action,
      });
      await adopt(v);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function choose(questionId: string, index: number) {
    if (
      !view ||
      busy ||
      view.status !== "ACTIVE" ||
      view.phase !== "MCQ" ||
      remaining <= 0
    )
      return;
    setSelected((p) => ({ ...p, [questionId]: index }));
    setSyncState("Saving…");
    choosing.current = choosing.current
      .catch(() => {})
      .then(() => queueAnswer(view.id, questionId, index));
    void choosing.current
      .then(() => flush())
      .catch((e) => {
        setSyncState(
          "Connection lost. Your answer is saved on this device and must sync before the deadline.",
        );
        setError(errorMessage(e));
      });
  }
  const confirm = (
    name: string,
    body: string,
    actionName: "SUBMIT_MCQ" | "FINISH",
  ) =>
    Alert.alert(name, body, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: () => void action(actionName) },
    ]);
  if (!attemptId)
    return (
      <Screen>
        <H1>{exam?.title || "Exam"}</H1>
        {(error || list.error) && (
          <Text style={styles.error}>{error || errorMessage(list.error)}</Text>
        )}
        {exam && (
          <>
            <Card>
              <P>{exam.instructions}</P>
              <P small>Opens: {date(exam.opensAt)}</P>
              <P small>Final deadline: {date(exam.closesAt)}</P>
              <P small>
                {exam.mode === "MCQ_CQ"
                  ? `MCQ ${exam.mcqSeconds / 60} + extra ${exam.mcqExtraSeconds / 60} min, then CQ ${exam.cqSeconds / 60} min.`
                  : `Written section ${exam.writtenSeconds / 60} min.`}
              </P>
              {Date.now() >= Date.parse(exam.opensAt) && Date.now() < Date.parse(exam.closesAt) && <P small>
                Available now: up to {formatTime(Math.min(
                  exam.mode === "MCQ_CQ" ? exam.mcqSeconds + exam.mcqExtraSeconds + exam.cqSeconds : exam.writtenSeconds,
                  Math.floor((Date.parse(exam.closesAt) - Date.now()) / 1000),
                ))}
              </P>}
              <P small>
                The deadline limits your available time. If you close or switch apps, the
                timer keeps running.
              </P>
              {exam.allowPause && canPauseForClass(user?.className) && (
                <P small>
                  Pause: Maximum {exam.maxPauseCount} times, up to{" "}
                  {exam.maxPauseSeconds / 60} min total. The timer
                  resumes automatically.
                </P>
              )}
            </Card>
            <Button
              title="Start or resume exam"
              disabled={busy || Date.now() < Date.parse(exam.opensAt) || Date.now() >= Date.parse(exam.closesAt)}
              onPress={() =>
                Alert.alert(
                  "Start exam?",
                  "The timer starts immediately. Write CQ answers in your notebook.",
                  [
                    { text: "Cancel", style: "cancel" },
                    { text: "Start", onPress: () => void start() },
                  ],
                )
              }
            />
          </>
        )}
      </Screen>
    );
  if (!view)
    return (
      <Screen>
        <P>Checking exam status…</P>
        {error && <Text style={styles.error}>{error}</Text>}
        <Button title="Try again" onPress={() => void refresh(true)} />
      </Screen>
    );
  if (view.status === "FINISHED")
    return (
      <Screen>
        <H1>Exam complete</H1>
        <Card>
          <P>
            MCQ-answers are locked. Write your answers in your notebook and bring it to your next class.

          </P>
          <P small>Published marks will appear in Results.</P>
        </Card>
        <Button
          title="Dashboard"
          onPress={() => router.replace("/dashboard")}
        />
      </Screen>
    );
  return (
    <Screen>
      <H1>{view.assessment.title}</H1>
      <Card>
        <P>
          {view.phase === "MCQ"
            ? "MCQ"
            : view.phase === "CQ"
              ? "CQ — Write in your notebook"
              : "Written · use your notebook"}
        </P>
        <Text style={styles.timer}>
          {formatTime(view.status === "PAUSED" ? pauseRemaining : remaining)}
        </Text>
        <P small>
          {view.status === "PAUSED"
            ? "Pause-Time until the deadline"
            : view.phase === "MCQ" && mainRemaining <= 0
              ? "Extra In progress"
              : "Section time remaining"}{" "}
          · Deadline: {date(view.deadline)}
        </P>
        {view.phase === "MCQ" && view.status === "ACTIVE" && (
          <P small>{syncState}</P>
        )}
      </Card>
      {error && (
        <>
          <Text style={styles.error}>{error}</Text>
          <Button
            title="Retry connection"
            secondary
            onPress={() => void refresh(true)}
          />
        </>
      )}
      {view.status === "PAUSED" ? (
        <Card>
          <H1>Exam paused</H1>
          <P>Questions are hidden. The exam resumes automatically when your break ends.</P>
          <P small>
            Used: {view.pauseCount} / {view.assessment.maxPauseCount} times
          </P>
          <Button
            title="Resume"
            disabled={busy}
            onPress={() => void action("RESUME")}
          />
        </Card>
      ) : !foreground || locked || remaining <= 0 ? (
        <Card>
          <P>Checking the exam timer with the server.</P>
          <Button
            title="Check again"
            secondary
            onPress={() => void refresh(true)}
          />
        </Card>
      ) : (
        <>
          {view.questions.map((q, i) => (
            <View style={styles.card} key={q.id}>
              <P small>
                Question {i + 1} · {q.marks} marks
              </P>
              <P>{q.text}</P>
              {q.type === "MCQ" &&
                q.options?.map((o, j) => (
                  <Pressable
                    key={j}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: selected[q.id] === j,
                      disabled: busy,
                    }}
                    disabled={busy}
                    onPress={() => choose(q.id, j)}
                    style={[
                      styles.option,
                      selected[q.id] === j && styles.selected,
                    ]}
                  >
                    <P>
                      {["A", "B", "C", "D"][j]}) {o}
                    </P>
                  </Pressable>
                ))}
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  inset: 0,
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: 0.12,
                  transform: [{ rotate: "-18deg" }],
                }}
              >
                <Text style={{ fontSize: 15, color: "#000" }}>
                  {user?.name}
                  {"\n"}
                  {user?.id}
                </Text>
              </View>
            </View>
          ))}
          {view.assessment.allowPause && canPauseForClass(user?.className) && (
            <Button
              title={`Pause (${view.pauseCount}/${view.assessment.maxPauseCount})`}
              secondary
              disabled={
                busy ||
                view.pauseCount >= view.assessment.maxPauseCount ||
                view.pauseRemainingSeconds <= 0
              }
              onPress={() => void action("PAUSE")}
            />
          )}
          {view.phase === "MCQ" ? (
            <Button
              title="MCQ Submit and start CQ"
              disabled={busy}
              onPress={() =>
                confirm(
                  "MCQ Submit MCQs?",
                  "Your MCQ answers will be locked and the written timer will start.",
                  "SUBMIT_MCQ",
                )
              }
            />
          ) : (
            <Button
              title="Finish exam"
              disabled={busy}
              onPress={() =>
                confirm(
                  "Finish exam?",
                  "Questions will close. Keep your written answers in your notebook.",
                  "FINISH",
                )
              }
            />
          )}
        </>
      )}
      <P small>
        Questions are hidden when you switch apps. The timer keeps running unless you pause.
      </P>
    </Screen>
  );
}
