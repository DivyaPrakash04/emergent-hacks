import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useListings } from "@/lib/roomsure/queries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MatchRowItem } from "./MatchRowItem";
import { useMatchRows, type MatchStatus } from "./useMatchRows";

const TABS: { key: MatchStatus; label: string; empty: string }[] = [
  { key: "matched", label: "Matches", empty: "No matches yet. When a host accepts, the room shows up here." },
  { key: "waiting", label: "Waiting", empty: "Nothing waiting. Swipe right on a room you like." },
  { key: "passed", label: "Passed", empty: "You haven't passed on any rooms." },
];

export function MatchesScreen() {
  const listings = useListings();
  const rows = useMatchRows(listings);
  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 lg:py-10">
      <h1 className="text-3xl font-bold text-foreground">Matches</h1>
      <Tabs defaultValue="matched">
        <TabsList className="grid h-12 w-full grid-cols-3 rounded-full bg-muted p-1">
          {TABS.map((t) => {
            const n = rows.filter((r) => r.status === t.key).length;
            return (
              <TabsTrigger key={t.key} value={t.key} className="h-10 rounded-full text-[14px] font-semibold data-[state=active]:bg-surface data-[state=active]:text-primary">
                {t.label}{n > 0 && <span className="ml-1.5 tabular-nums text-muted-foreground">{n}</span>}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {TABS.map((t) => {
          const list = rows.filter((r) => r.status === t.key);
          return (
            <TabsContent key={t.key} value={t.key} className="mt-4">
              {list.length ? (
                <ul className="space-y-3">{list.map((r) => <MatchRowItem key={r.listing.id} row={r} />)}</ul>
              ) : (
                <div className="space-y-4 rounded-[var(--radius-card)] border border-dashed border-hairline bg-surface p-8 text-center">
                  <Heart className="mx-auto size-8 text-primary" />
                  <p className="text-muted-foreground">{t.empty}</p>
                  <Button asChild variant="soft"><Link to="/discover">Go to Discover</Link></Button>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
