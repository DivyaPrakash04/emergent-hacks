/** Pasted-listing samples for the scam check. Synthetic text; 555-01xx is a fictional number range. */
export interface OutsideExample {
  id: string;
  /** Chip label on /check. */
  label: string;
  text: string;
  /** What the check should say, for tests and rehearsal. */
  expected: "high_risk" | "caution" | "no_issues_found";
}

export const OUTSIDE_EXAMPLES: OutsideExample[] = [
  {
    id: "too-good",
    label: "Too good to be true",
    text: "Furnished room near Wickenden St, $550/month, available June 1. I'm working abroad right now so I can't show the room, but I'll mail you the keys. Please wire the $550 deposit today to hold it, many people are interested. Text me at (401) 555-0147.",
    expected: "high_risk",
  },
  {
    id: "sublet-caution",
    label: "Sublet, some caution",
    text: "Summer sublet: furnished room on College Hill, $900/month, available June 1 through August 20. I'm the current tenant and my lease allows sublets. Lots of people are asking, so let me know soon. Email me at summer.sublet@example.com.",
    expected: "caution",
  },
  {
    id: "looks-normal",
    label: "Looks normal",
    text: "Private furnished room in Downcity, $1,050/month, available June 1. Shared kitchen and in-unit laundry. Happy to do a video call or an in-person viewing any weekday evening before you decide, and I can share the lease terms.",
    expected: "no_issues_found",
  },
];
