import { Ban, Cat, Coins, Moon, Plug, Timer, Users, Wind } from "lucide-react";
import type { ListingDetails } from "@/lib/roomsure/types";
import { money } from "@/components/roomsure/discover/format";

export const ROOM_TYPE_LABEL: Record<ListingDetails["roomType"], string> = {
  private: "Private room in a shared home",
  shared: "Shared room",
  studio: "Whole studio",
};

const GUESTS: Record<ListingDetails["rules"]["guests"], string> = {
  fine: "Guests are fine",
  ask: "Ask before having guests",
  no: "No overnight guests",
};

/** Facts a host entered on "List your room". */
export function HouseDetails({ details: d }: { details: ListingDetails }) {
  const rows = [
    { icon: Coins, text: d.deposit > 0 ? `${money(d.deposit)} deposit, paid only after you've viewed the room` : "No deposit" },
    { icon: Plug, text: d.utilitiesIncluded ? "Utilities included" : "Utilities not included" },
    { icon: Timer, text: `Minimum stay: ${d.minStayMonths} month${d.minStayMonths > 1 ? "s" : ""}` },
    { icon: d.rules.smoking ? Wind : Ban, text: d.rules.smoking ? "Smoking allowed" : "No smoking" },
    { icon: Cat, text: d.rules.pets ? "Pets allowed" : "No pets" },
    { icon: Users, text: GUESTS[d.rules.guests] },
    ...(d.rules.quietHours ? [{ icon: Moon, text: `Quiet hours: ${d.rules.quietHours}` }] : []),
  ];
  return (
    <ul className="space-y-2.5">
      {rows.map(({ icon: I, text }) => (
        <li key={text} className="flex items-center gap-3 text-[15px] text-foreground"><I className="size-5 text-primary" />{text}</li>
      ))}
    </ul>
  );
}
