import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/eden";

export const holidayKeys = {
  all: ["holidays"] as const,
  list: (from?: string, to?: string) => [...holidayKeys.all, { from, to }] as const,
};

export function useHolidays(from?: string, to?: string) {
  return useQuery({
    queryKey: holidayKeys.list(from, to),
    queryFn: async () => {
      const { data, error } = await (api.holidays as any).get({ query: { from, to } });
      if (error) throw new Error(String(error));
      const items = data as Array<{ id: string; date: string | Date; reason: string | null; createdAt: string }>;
      return items.map((h) => ({
        ...h,
        date: h.date instanceof Date
          ? `${h.date.getFullYear()}-${String(h.date.getMonth() + 1).padStart(2, "0")}-${String(h.date.getDate()).padStart(2, "0")}`
          : String(h.date),
      }));
    },
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { date: string; reason?: string | null }) => {
      const { data, error } = await (api.holidays as any).post(body);
      if (error) throw new Error(String(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.all });
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (api.holidays as any)[id].delete();
      if (error) throw new Error(String(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: holidayKeys.all });
    },
  });
}
