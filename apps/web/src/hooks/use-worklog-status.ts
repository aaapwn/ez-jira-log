import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/eden";

export const worklogKeys = {
  all: ["worklog"] as const,
  status: (from: string, to: string) => [...worklogKeys.all, "status", from, to] as const,
};

export function useWorklogStatus(from: string, to: string) {
  return useQuery({
    queryKey: worklogKeys.status(from, to),
    queryFn: async () => {
      const { data, error } = await api.jira["check-status"].get({
        query: { from, to },
      });
      if (error) throw new Error(String(error));
      return data;
    },
    enabled: !!from && !!to,
  });
}
