import { useMemo, useSyncExternalStore } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "./api";
import { useHost } from "./host";
import type { RoomListing } from "./types";

/** The shared rooms. Identical on the server and in the browser, so pages hydrate cleanly. */
export const listingsQuery = queryOptions({
  queryKey: ["roomsure", "listings"],
  queryFn: () => api.getListings(),
  staleTime: Infinity,
});

/**
 * The shared rooms plus rooms published on "List your room" in this browser.
 * The published ones live in browser storage, which the server can't see, so they're added
 * after hydration (useHost reports none during the first render), never in the query itself.
 */
export function useListings(): RoomListing[] {
  const { data } = useSuspenseQuery(listingsQuery);
  const published = useHost((s) => s.published);
  return useMemo(() => (published.length ? [...data, ...published] : data), [data, published]);
}

const noop = () => () => {};
/** False on the server and during hydration, true once the page is live in the browser. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}
