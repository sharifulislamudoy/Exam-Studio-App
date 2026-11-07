import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  formatTime,
  type AssessmentView,
  type AttemptView,
} from "../src/contracts";
import { api } from "../src/api";
import { useSession } from "../src/session";
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
} from "../src/ui";
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
          setSyncState("সব উত্তর সংরক্ষিত");
          return;
        }
        setSyncState("উত্তর সংরক্ষণ হচ্ছে…");
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
            setSyncState("MCQ সময় শেষ। দেরিতে পৌঁছানো উত্তর গ্রহণ করা হয়নি।");
            if (!rejected.current) {
              rejected.current = true;
              Alert.alert(
                "সময় শেষ",
                "সার্ভারে সময় শেষ হওয়ার পরে পৌঁছানো উত্তর গ্রহণ করা হয়নি।",
              );
            }
            return;
          }
          await markSaved(a);
        }
      }
      throw new Error("এখনও উত্তর sync হচ্ছে। আবার চেষ্টা করো।");
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
    setSyncState("সংরক্ষণ হচ্ছে…");
    choosing.current = choosing.current
      .catch(() => {})
      .then(() => queueAnswer(view.id, questionId, index));
    void choosing.current
      .then(() => flush())
      .catch((e) => {
        setSyncState(
          "নেটে সমস্যা। উত্তর ফোনে রাখা আছে; সময়ের মধ্যে sync হতে হবে।",
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
      { text: "বাতিল", style: "cancel" },
      { text: "নিশ্চিত", onPress: () => void action(actionName) },
    ]);
  if (!attemptId)
    return (
      <Screen>
        <H1>{exam?.title || "পরীক্ষা"}</H1>
        {(error || list.error) && (
          <Text style={styles.error}>{error || errorMessage(list.error)}</Text>
        )}
        {exam && (
          <>
            <Card>
              <P>{exam.instructions}</P>
              <P small>চূড়ান্ত deadline: {date(exam.closesAt)}</P>
              <P small>
                {exam.mode === "MCQ_CQ"
                  ? `MCQ ${exam.mcqSeconds / 60} + extra ${exam.mcqExtraSeconds / 60} মিনিট। তারপর CQ ${exam.cqSeconds / 60} মিনিট।`
                  : `লিখিত অংশ ${exam.writtenSeconds / 60} মিনিট।`}
              </P>
              <P small>
                Deadline-এর বাকি সময় কম হলে ততটুকুই পাবে। App বন্ধ বা অন্য app-এ
                গেলে timer থামবে না।
              </P>
              {exam.allowPause && user?.className !== "3" && (
                <P small>
                  Pause: সর্বোচ্চ {exam.maxPauseCount} বার, মোট{" "}
                  {exam.maxPauseSeconds / 60} মিনিট। Pause budget শেষ হলে timer
                  নিজে থেকে চলবে।
                </P>
              )}
            </Card>
            <Button
              title="পরীক্ষা শুরু / ফিরে যাও"
              disabled={busy}
              onPress={() =>
                Alert.alert(
                  "পরীক্ষা শুরু করবে?",
                  "শুরু করার পর timer চলবে। CQ খাতায় লিখবে।",
                  [
                    { text: "বাতিল", style: "cancel" },
                    { text: "শুরু", onPress: () => void start() },
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
        <P>পরীক্ষার অবস্থা যাচাই হচ্ছে…</P>
        {error && <Text style={styles.error}>{error}</Text>}
        <Button title="আবার চেষ্টা করো" onPress={() => void refresh(true)} />
      </Screen>
    );
  if (view.status === "FINISHED")
    return (
      <Screen>
        <H1>পরীক্ষা শেষ হয়েছে</H1>
        <Card>
          <P>
            MCQ-এর সংরক্ষিত উত্তর লক হয়েছে। লিখিত উত্তর খাতায় রাখো; শিক্ষক পরদিন
            দেখবেন।
          </P>
          <P small>ফলাফল প্রকাশ হলে Results-এ দেখা যাবে।</P>
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
              ? "CQ — খাতায় লেখো"
              : "লিখিত — খাতায় লেখো"}
        </P>
        <Text style={styles.timer}>
          {formatTime(view.status === "PAUSED" ? pauseRemaining : remaining)}
        </Text>
        <P small>
          {view.status === "PAUSED"
            ? "Pause-এর বাকি সময়"
            : view.phase === "MCQ" && mainRemaining <= 0
              ? "Extra সময় চলছে"
              : "অংশটির বাকি সময়"}{" "}
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
            title="সংযোগ আবার দেখো"
            secondary
            onPress={() => void refresh(true)}
          />
        </>
      )}
      {view.status === "PAUSED" ? (
        <Card>
          <H1>পরীক্ষা paused</H1>
          <P>প্রশ্ন লুকানো আছে। Pause-এর সময় শেষ হলে timer নিজে থেকে চলবে।</P>
          <P small>
            ব্যবহার: {view.pauseCount} / {view.assessment.maxPauseCount} বার
          </P>
          <Button
            title="Resume"
            disabled={busy}
            onPress={() => void action("RESUME")}
          />
        </Card>
      ) : !foreground || locked || remaining <= 0 ? (
        <Card>
          <P>সময় ও পরীক্ষার অবস্থা সার্ভারে যাচাই হচ্ছে।</P>
          <Button
            title="আবার যাচাই করো"
            secondary
            onPress={() => void refresh(true)}
          />
        </Card>
      ) : (
        <>
          {view.questions.map((q, i) => (
            <View style={styles.card} key={q.id}>
              <P small>
                প্রশ্ন {i + 1} · {q.marks} নম্বর
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
                      {["ক", "খ", "গ", "ঘ"][j]}) {o}
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
          {view.assessment.allowPause && user?.className !== "3" && (
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
              title="MCQ জমা দিয়ে CQ শুরু"
              disabled={busy}
              onPress={() =>
                confirm(
                  "MCQ জমা দেবে?",
                  "এরপর MCQ-তে ফিরে আসা যাবে না। CQ-এর সময় শুরু হবে।",
                  "SUBMIT_MCQ",
                )
              }
            />
          ) : (
            <Button
              title="খাতায় লেখা শেষ — পরীক্ষা শেষ করো"
              disabled={busy}
              onPress={() =>
                confirm(
                  "পরীক্ষা শেষ করবে?",
                  "প্রশ্ন আর দেখা যাবে না। তোমার উত্তর খাতায় রাখো।",
                  "FINISH",
                )
              }
            />
          )}
        </>
      )}
      <P small>
        অন্য app-এ গেলে প্রশ্ন আড়াল হবে। অনুমোদিত Pause ছাড়া timer চলবে।
      </P>
    </Screen>
  );
}
