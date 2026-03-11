import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/eden";

export const templateKeys = {
  all: ["templates"] as const,
  list: () => [...templateKeys.all, "list"] as const,
};

export function useTemplates() {
  return useQuery({
    queryKey: templateKeys.list(),
    queryFn: async () => {
      const { data, error } = await (api.templates as any).get();
      if (error) throw new Error(String(error));
      return data;
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      name: string;
      issueKey?: string | null;
      comment: string;
      defaultHours: number;
      isActive?: boolean;
    }) => {
      const { data, error } = await (api.templates as any).post(body);
      if (error) throw new Error(String(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      issueKey?: string | null;
      comment?: string;
      defaultHours?: number;
      isActive?: boolean;
    }) => {
      const { data, error } = await api.templates({ id }).put(body);
      if (error) throw new Error(String(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.templates({ id }).delete();
      if (error) throw new Error(String(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}
