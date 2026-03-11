import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/eden";

export interface TemplateSetItem {
  issueKey?: string | null;
  comment: string;
  hours: number;
  startTime?: string | null;
  endTime?: string | null;
}

export interface TemplateSet {
  id: string;
  name: string;
  items: TemplateSetItem[];
  isActive: boolean;
}

export const templateSetKeys = {
  all: ["template-sets"] as const,
  list: () => [...templateSetKeys.all, "list"] as const,
};

export function useTemplateSets() {
  return useQuery({
    queryKey: templateSetKeys.list(),
    queryFn: async () => {
      const { data, error } = await (api["template-sets"] as any).get();
      if (error) throw new Error(String(error));
      return data as TemplateSet[];
    },
  });
}

export function useCreateTemplateSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      name: string;
      items: TemplateSetItem[];
      isActive?: boolean;
    }) => {
      const { data, error } = await (api["template-sets"] as any).post(body);
      if (error) throw new Error(String(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateSetKeys.all });
    },
  });
}

export function useUpdateTemplateSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      items?: TemplateSetItem[];
      isActive?: boolean;
    }) => {
      const { data, error } = await (api["template-sets"] as any)({ id }).put(
        body,
      );
      if (error) throw new Error(String(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateSetKeys.all });
    },
  });
}

export function useDeleteTemplateSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await (api["template-sets"] as any)({
        id,
      }).delete();
      if (error) throw new Error(String(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateSetKeys.all });
    },
  });
}
