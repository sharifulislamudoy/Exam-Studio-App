import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { InboxView } from "./contracts";

export function useInbox() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<InboxView[]>("/notifications"),
    refetchInterval: 15000,
  });
}
