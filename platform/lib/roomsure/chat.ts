/** Canned host conversation for the mock chat. "Chat demo · no real messages". */
import type { ChatMessage, RoomListing } from "./types";

export interface ChatScript {
  /** Shown one at a time, with a typing indicator, when the chat opens. */
  opening: ChatMessage[];
  /** Quick replies the seeker can tap; each adds the seeker's line and the host's answer. */
  replies: { prompt: string; answer: string }[];
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const niceDate = (iso: string): string => {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
};

export function chatScript(room: RoomListing, seekerName = "Maya", moveIn = "2027-06-01"): ChatScript {
  const host = room.host.name.split(" ")[0];
  const first = seekerName.split(" ")[0];
  const furnished = room.facilities.includes("furnished");
  return {
    opening: [
      { from: "host", text: `Hi ${first}! I'm ${host}. I saw you're interested in the ${room.title.toLowerCase()}. It's free from ${niceDate(room.availableFrom)}.` },
      { from: "host", text: "Happy to answer anything. You can also walk through it in 3D from the listing." },
    ],
    replies: [
      { prompt: `Is ${niceDate(moveIn)} move-in OK?`, answer: `Yes, ${niceDate(moveIn)} works. I'll be there to give you the keys and show you around.` },
      { prompt: furnished ? "What furniture is included?" : "Is it OK to bring my own furniture?", answer: furnished ? "Bed, desk, chair, dresser and a reading lamp. Bedding is up to you." : "Of course. The room is empty, so bring whatever you like." },
      { prompt: "Can I reserve the first month?", answer: "Of course, go ahead and reserve through Roomsure. I'll confirm as soon as it comes through." },
    ],
  };
}
