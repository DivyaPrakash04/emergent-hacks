import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoCollage } from "./PhotoCollage";
import { TrustPoints } from "./TrustPoints";
import { CreateAccountDialog } from "./CreateAccountDialog";

export function WelcomeHero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-16">
      <div className="order-2 lg:order-1">
        <h1 className="text-[2.5rem] font-extrabold leading-[1.02] text-foreground sm:text-6xl">
          A room you can <span className="text-primary">trust</span>, for 1 to 6 months
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Tell us what you need. We rank rooms by your trade-offs, show you why, and let you walk through them before you pay.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="hero" size="xl" className="w-full sm:w-auto">
            <Link to="/start">
              Continue as Maya (demo)
              <ArrowRight />
            </Link>
          </Button>
          <CreateAccountDialog />
          <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
            <Link to="/list-your-room">List your room</Link>
          </Button>
        </div>
        <div className="mt-10">
          <TrustPoints />
        </div>
        <p className="mt-10 border-t border-hairline pt-5 text-[13px] text-muted-foreground">
          Demo · ID and card checks are simulated. We never ask for card numbers or ID documents.
        </p>
      </div>
      <div className="order-1 lg:order-2">
        <PhotoCollage />
      </div>
    </section>
  );
}
