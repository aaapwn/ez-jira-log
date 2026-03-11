import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/eden";

import { activityKeys } from "./use-activity-summary";
import { worklogKeys } from "./use-worklog-status";

interface WorklogEntry {
  issueKey: string;
  date: string;
  timeSpentSeconds: number;
  comment: string;
  started?: string;
}

export function useSubmitWorklogs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entries: WorklogEntry[]) => {
      const { data, error } = await api.jira.worklog.post({
        entries,
      });
      if (error) throw new Error(String(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: worklogKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}

export function useDeleteWorklog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      issueKey,
      worklogId,
    }: {
      issueKey: string;
      worklogId: string;
    }) => {
      const { data, error } = await (api.jira.worklog as any)[issueKey][
        worklogId
      ].delete();
      if (error) throw new Error(String(error));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: worklogKeys.all });
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}
