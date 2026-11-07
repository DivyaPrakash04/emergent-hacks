import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateAccountDialog() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setOpen(false);
    navigate({ to: "/start" });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="soft" size="xl" className="w-full sm:w-auto">
          Create account
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[var(--radius-card)] border-hairline bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-bold">Create your account</DialogTitle>
          <DialogDescription>Demo only. Nothing you type here is sent or stored.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ca-name">Name</Label>
            <Input id="ca-name" required autoComplete="name" className="h-11 rounded-[var(--radius-button)] text-base" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ca-email">Email</Label>
            <Input id="ca-email" type="email" required autoComplete="email" className="h-11 rounded-[var(--radius-button)] text-base" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ca-password">Password</Label>
            <Input id="ca-password" type="password" required minLength={6} autoComplete="new-password" className="h-11 rounded-[var(--radius-button)] text-base" />
          </div>
          <Button type="submit" variant="hero" size="xl" className="w-full">
            Create account and continue
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
