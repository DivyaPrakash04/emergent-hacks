// STAND-IN: sample outside listings for the scam check. Claude Code's real version replaces it.
export interface OutsideExample {
  id: string;
  label: string;
  text: string;
}

export const OUTSIDE_EXAMPLES: OutsideExample[] = [
  {
    id: "too-good",
    label: "Too good to be true",
    text:
      "Beautiful furnished 1 bedroom in Downcity, only $450/month, June 1 to August 31. I'm currently overseas for work so I can't show the apartment in person. " +
      "To hold it, please send a $900 deposit by wire transfer today and I will mail you the keys. Many people are interested, so you need to decide within 24 hours. " +
      "Contact me only by email, not through the site.",
  },
  {
    id: "sublet-caution",
    label: "Sublet, some caution",
    text:
      "Subletting my room on Federal Hill for the summer, June 1 to August 20, $800/month. Shared apartment with two roommates, furnished. " +
      "My landlord doesn't know about the sublet yet, so please don't contact them. Payment through Venmo or Zelle preferred.",
  },
  {
    id: "looks-normal",
    label: "Looks normal",
    text:
      "Private room in a quiet Fox Point house, $975/month, available June 1 to August 31. Furnished with a bed, desk and dresser. Shared kitchen and laundry. " +
      "Happy to do a video tour or meet in person. Lease signed through the property manager.",
  },
];
