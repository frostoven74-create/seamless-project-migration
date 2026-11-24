import { Link, useRouterState } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { NAV } from "./nav";
import { cn } from "@/lib/utils";
import { pad } from "@/features/sdg/sdgs";

const QUICK = ["/planet", "/ripple", "/ledger", "/atlas"] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <header
        className={cn(
          "no-print fixed inset-x-0 top-0 z-50 transition-colors duration-500",
          scrolled ? "border-b border-hairline bg-void/80 backdrop-blur-md" : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 md:px-10">
          <Link to="/" className="group flex items-baseline gap-3" aria-label="EARTH//OS home">
            <span className="font-mono text-sm tracking-[0.18em] text-bone">
              EARTH<span className="text-sprout">//</span>OS
            </span>
            <span className="hidden font-display text-sm italic text-lichen transition-colors group-hover:text-bone sm:inline">
              The Living Planet
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
            {NAV.filter((n) => (QUICK as readonly string[]).includes(n.to)).map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="link-underline font-mono text-[11px] uppercase tracking-[0.16em] text-lichen transition-colors hover:text-bone"
                activeProps={{ className: "text-bone" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <Dialog.Trigger asChild>
            <button
              type="button"
              className="group flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-bone"
              aria-label="Open navigation menu"
            >
              <span className="hidden sm:inline">Index</span>
              <span className="relative flex h-8 w-8 flex-col items-center justify-center gap-1.5 rounded-full border border-hairline transition-colors group-hover:border-sprout/60">
                <span className="h-px w-3.5 bg-bone" />
                <span className="h-px w-3.5 bg-bone" />
              </span>
            </button>
          </Dialog.Trigger>
        </div>
      </header>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-void/95 backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content className="fixed inset-0 z-[70] overflow-y-auto focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2">
          <Dialog.Title className="sr-only">Site index</Dialog.Title>
          <Dialog.Description className="sr-only">All sections of EARTH//OS</Dialog.Description>
          <div className="mx-auto flex min-h-full max-w-[1400px] flex-col px-5 pb-10 md:px-10">
            <div className="flex h-16 items-center justify-between">
              <span className="font-mono text-sm tracking-[0.18em] text-bone">
                EARTH<span className="text-sprout">//</span>OS
              </span>
              <Dialog.Close className="font-mono text-[11px] uppercase tracking-[0.16em] text-lichen hover:text-bone">
                Close ✕
              </Dialog.Close>
            </div>
            <nav aria-label="Site index" className="mt-6 grid flex-1 content-center gap-x-10 md:grid-cols-2">
              {NAV.map((n, i) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className="group flex items-baseline gap-5 border-b border-hairline py-4 md:py-5"
                  activeProps={{ "aria-current": "page" }}
                >
                  <span className="w-8 font-mono text-xs text-sprout/80">{pad(i + 1)}</span>
                  <span className="font-display text-4xl leading-none text-bone transition-all duration-500 group-hover:translate-x-2 group-hover:italic group-aria-[current=page]:italic group-aria-[current=page]:text-sprout md:text-5xl">
                    {n.label}
                  </span>
                  <span className="ml-auto hidden font-mono text-[11px] uppercase tracking-[0.14em] text-lichen lg:inline">
                    {n.note}
                  </span>
                </Link>
              ))}
            </nav>
            <p className="mt-10 max-w-xl font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em] text-lichen">
              From problems to possibilities. Official UN content is labelled; everything else says where it came from.
            </p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
