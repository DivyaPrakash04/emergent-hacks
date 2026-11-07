import { Wordmark } from "./Wordmark";
import { DemoPill } from "./DemoPill";

export function AppHeader({ hideWordmarkOnDesktop = false }: { hideWordmarkOnDesktop?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <div className={hideWordmarkOnDesktop ? "lg:invisible" : undefined}>
          <Wordmark />
        </div>
        <DemoPill />
      </div>
    </header>
  );
}
