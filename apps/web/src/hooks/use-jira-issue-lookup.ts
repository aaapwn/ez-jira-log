import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { api } from "@/lib/eden";

const JIRA_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/;

export function useJiraIssueLookup(issueKey: string) {
  const [debouncedKey, setDebouncedKey] = useState("");

  useEffect(() => {
    const trimmed = issueKey.trim().toUpperCase();
    if (!JIRA_KEY_PATTERN.test(trimmed)) {
      setDebouncedKey("");
      return;
    }

    const timer = setTimeout(() => setDebouncedKey(trimmed), 1000);
    return () => clearTimeout(timer);
  }, [issueKey]);

  const { data, isLoading } = useQuery({
    queryKey: ["jira-issue", debouncedKey],
    queryFn: async () => {
      const res = await api.jira.issue({ key: debouncedKey }).get();
      if (res.error) throw new Error("Not found");
      return res.data;
    },
    enabled: !!debouncedKey,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  return {
    summary: data?.summary ?? null,
    isLoading: isLoading && !!debouncedKey,
  };
}
