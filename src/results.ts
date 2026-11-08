import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

export type StudentResult = {
  id: string;
  assessmentId: string;
  title: string;
  subject: string;
  chapter: string;
  kind: string;
  status: string;
  published: boolean;
  totalMax: number;
  mcqScore?: number;
  writtenScore?: number | null;
  feedback?: string;
};

export function useResults() {
  return useQuery({
    queryKey: ["results"],
    queryFn: () => api<StudentResult[]>("/results"),
    refetchInterval: 15000,
  });
}

export const score = (result: StudentResult) => (result.mcqScore ?? 0) + (result.writtenScore ?? 0);
