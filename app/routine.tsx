import { useQuery } from "@tanstack/react-query";
import { api } from "../../../Exam-Studio-Required-Files/Exam-Studio-App/src/api";
import { Button, Card, Gate, H1, P, Screen, errorMessage } from "../../../Exam-Studio-Required-Files/Exam-Studio-App/src/ui";

type Lesson = {
  id: string;
  weekday: number;
  startsAt: string;
  subject: string;
  minutes: number;
  active: boolean;
  attendance: { date: string; status: string; movedTo: string | null }[];
};
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const upcoming = (date: string) => Date.parse(date) >= Date.now();
const dhakaDate = (date: string) => new Date(date).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" });

function Content() {
  const query = useQuery({ queryKey: ["routine"], queryFn: () => api<Lesson[]>("/routine") });
  const lessons = query.data ?? [];
  const active = lessons.filter((lesson) => lesson.active);
  const changes = lessons.flatMap((lesson) => lesson.attendance
    .filter((entry) => entry.status === "RESCHEDULED" && entry.movedTo && upcoming(entry.movedTo))
    .map((entry) => ({ key: lesson.id + entry.date, subject: lesson.subject, date: entry.date, movedTo: entry.movedTo! })))
    .sort((a, b) => a.movedTo.localeCompare(b.movedTo));
  return <Screen>
    <H1>Weekly routine</H1>
    <P small>Bangladesh time</P>
    {query.isPending && <P>Loading lessons…</P>}
    {query.error && <><P>{errorMessage(query.error)}</P><Button title="Retry" onPress={() => void query.refetch()} /></>}
    {query.data && !active.length && !changes.length && <P>No lessons scheduled.</P>}
    {changes.map((entry) => <Card key={entry.key}>
      <P>{entry.subject} · Rescheduled</P><P small>{entry.date} → {dhakaDate(entry.movedTo)}</P>
    </Card>)}
    {active.map((lesson) => <Card key={lesson.id}>
      <P>{lesson.subject}</P><P small>{weekdays[lesson.weekday]} · {lesson.startsAt} · {lesson.minutes} min</P>
    </Card>)}
  </Screen>;
}

export default function Routine() {
  return <Gate><Content /></Gate>;
}
