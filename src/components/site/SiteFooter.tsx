import { Link } from "@tanstack/react-router";
import { NAV } from "./nav";
import { PROV, Prov, type ProvKind } from "./Prov";

export function SiteFooter() {
  return (
    <footer className="no-print relative mt-24 overflow-hidden border-t border-hairline">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-5 py-16 md:grid-cols-12 md:px-10">
        <div className="md:col-span-5">
          <p className="font-display text-4xl leading-tight text-bone md:text-5xl">
            From problems <em className="text-sprout">to possibilities.</em>
          </p>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-lichen">
            EARTH//OS links real sustainability problems to the 17 UN Sustainable Development Goals, compares practical
            options and records outcomes only when evidence supports them.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-2 md:col-span-3">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="link-underline w-fit text-sm text-lichen hover:text-bone">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="md:col-span-4">
          <p className="eyebrow mb-4">How to read this platform</p>
          <ul className="space-y-2">
            {(Object.keys(PROV) as ProvKind[]).map((k) => (
              <li key={k} className="flex items-start gap-3 text-xs text-lichen">
                <Prov kind={k} className="shrink-0" />
                <span className="pt-0.5">{PROV[k].meaning}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-2 border-t border-hairline px-5 py-6 font-mono text-[10px] uppercase tracking-[0.14em] text-lichen md:flex-row md:justify-between md:px-10">
        <span>EARTH//OS — independent project. Not affiliated with or endorsed by the United Nations.</span>
        <span>Your work is stored on this device only.</span>
      </div>
      <div aria-hidden className="pointer-events-none select-none px-5 pb-2 text-center font-display text-[22vw] leading-[0.8] text-bone/[0.04]">
        EARTH//OS
      </div>
    </footer>
  );
}
