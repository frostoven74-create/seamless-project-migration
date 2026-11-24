import { useReveal } from "./useReveal";

export function PageIntro({
  index,
  eyebrow,
  title,
  lede,
  children,
}: {
  index: string;
  eyebrow: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const ref = useReveal<HTMLElement>();
  return (
    <header ref={ref} className="relative border-b border-hairline px-5 pb-12 pt-32 md:px-10 md:pb-16 md:pt-40">
      <div className="mx-auto grid max-w-[1400px] gap-8 md:grid-cols-12">
        <div className="md:col-span-3" data-reveal>
          <p className="eyebrow">
            <span className="text-sprout">{index}</span> — {eyebrow}
          </p>
        </div>
        <div className="md:col-span-9">
          <h1 data-reveal className="font-display text-5xl leading-[0.95] text-bone md:text-7xl lg:text-8xl">
            {title}
          </h1>
          {lede && (
            <p data-reveal className="mt-6 max-w-2xl text-lg leading-relaxed text-lichen md:text-xl">
              {lede}
            </p>
          )}
          {children && <div data-reveal className="mt-8">{children}</div>}
        </div>
      </div>
    </header>
  );
}
