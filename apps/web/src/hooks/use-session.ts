import { useQuery, useQueryClient } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/lib/query-client";

export const sessionQueryKey = ["session"] as const;

const sessionQueryFn = async () => {
  const result = await authClient.getSession();
  return result.data ?? null;
};

export function useSession() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: sessionQueryFn,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

export function useInvalidateSession() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: sessionQueryKey });
}

/**
 * Uses queryClient.fetchQuery so that `beforeLoad` shares the
 * same cache entry as `useSession` — no duplicate requests.
 */
export function prefetchSession() {
  return queryClient.fetchQuery({
    queryKey: sessionQueryKey,
    queryFn: sessionQueryFn,
    staleTime: 1000 * 60 * 5,
  });
}
