import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function DiscoverPending() {
  return (
    <div className="mx-auto max-w-[400px] space-y-4 px-4 py-8" aria-busy="true" aria-label="Loading rooms">
      <div className="h-5 w-40 animate-pulse rounded-full bg-muted" />
      <div className="h-[520px] animate-pulse rounded-[var(--radius-card)] bg-muted" />
    </div>
  );
}

export function DiscoverError() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-[400px] px-4 py-12 text-center">
      <h1 className="text-2xl font-bold text-foreground">We couldn't load rooms</h1>
      <p className="mt-2 text-muted-foreground">Check your connection, then try again.</p>
      <Button variant="hero" size="xl" className="mt-5" onClick={() => router.invalidate()}>
        Try again
      </Button>
    </div>
  );
}
