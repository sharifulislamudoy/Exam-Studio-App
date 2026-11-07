import * as SQLite from "expo-sqlite";
const dbPromise = SQLite.openDatabaseAsync("exam-answers.db").then(
  async (db) => {
    await db.execAsync(
      "CREATE TABLE IF NOT EXISTS answers (attempt TEXT NOT NULL, question TEXT NOT NULL, selected INTEGER NOT NULL, revision INTEGER NOT NULL DEFAULT 1, pending INTEGER NOT NULL DEFAULT 1, PRIMARY KEY(attempt,question));",
    );
    return db;
  },
);
export type QueuedAnswer = {
  attempt: string;
  question: string;
  selected: number;
  revision: number;
  pending: number;
};
export async function queueAnswer(
  attempt: string,
  question: string,
  selected: number,
) {
  const db = await dbPromise;
  return (await db.getFirstAsync<QueuedAnswer>(
    "INSERT INTO answers(attempt,question,selected,revision,pending) VALUES (?,?,?,1,1) ON CONFLICT(attempt,question) DO UPDATE SET selected=excluded.selected,revision=answers.revision+1,pending=1 RETURNING *",
    attempt,
    question,
    selected,
  ))!;
}
export async function pendingAnswers(attempt: string) {
  return (await dbPromise).getAllAsync<QueuedAnswer>(
    "SELECT * FROM answers WHERE attempt=? AND pending=1",
    attempt,
  );
}
export async function markSaved(a: QueuedAnswer) {
  await (
    await dbPromise
  ).runAsync(
    "UPDATE answers SET pending=0 WHERE attempt=? AND question=? AND revision=?",
    a.attempt,
    a.question,
    a.revision,
  );
}
export async function discardPending(attempt: string) {
  await (
    await dbPromise
  ).runAsync("UPDATE answers SET pending=0 WHERE attempt=?", attempt);
}
export async function clearAnswers() {
  await (await dbPromise).runAsync("DELETE FROM answers");
}
