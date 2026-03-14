import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/eden";

export const configKeys = {
  all: ["config"] as const,
  user: () => [...configKeys.all, "user"] as const,
};

export function useUserConfig() {
  return useQuery({
    queryKey: configKeys.user(),
    queryFn: async () => {
      const { data, error } = await api.user.config.get();
      if (error) throw new Error(String(error));
      return data;
    },
  });
}

export function useUpdateUserConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      workingHours?: number;
      timezone?: string;
      defaultComment?: string | null;
      sheetSpreadsheetId?: string | null;
      sheetName?: string | null;
      sheetStartColumn?: string | null;
      sheetCheckInRow?: number | null;
      sheetCheckOutRow?: number | null;
    }) => {
      const { data, error } = await api.user.config.put(body);
      if (error) throw new Error(String(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: configKeys.all });
    },
  });
}
