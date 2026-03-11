import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/eden";

export const activityKeys = {
  all: ["activities"] as const,
  summary: (from: string, to: string) => [...activityKeys.all, "summary", from, to] as const,
};

function normalizeDateValue(val: unknown): string {
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

export function useActivitySummary(from: string, to: string) {
  return useQuery({
    queryKey: activityKeys.summary(from, to),
    queryFn: async () => {
      const { data, error } = await api.activities.summary.get({
        query: { from, to },
      });
      if (error) throw new Error(String(error));
      return (data ?? []).map((d: any) => ({
        ...d,
        date: normalizeDateValue(d.date),
      }));
    },
    enabled: !!from && !!to,
  });
}
