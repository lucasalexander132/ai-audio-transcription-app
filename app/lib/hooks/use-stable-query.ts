"use client";

import { useRef } from "react";
import { useQuery } from "convex/react";
import type { FunctionReference, FunctionArgs, FunctionReturnType } from "convex/server";

/**
 * A variant of useQuery that keeps returning the last non-undefined result
 * while a new query is loading. Prevents flash of loading state when
 * query arguments change (e.g., during search).
 *
 * Source: https://stack.convex.dev/help-my-app-is-overreacting
 */
export function useStableQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: FunctionArgs<Query> | "skip"
): FunctionReturnType<Query> | undefined {
  const result = useQuery(query, args);
  const stored = useRef(result);

  if (result !== undefined) {
    stored.current = result;
  }

  return stored.current;
}
