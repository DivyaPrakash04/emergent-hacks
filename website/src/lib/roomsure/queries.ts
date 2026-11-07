import { queryOptions } from "@tanstack/react-query";
import { api } from "./api";

export const listingsQuery = queryOptions({
  queryKey: ["roomsure", "listings"],
  queryFn: () => api.getListings(),
  staleTime: Infinity,
});
