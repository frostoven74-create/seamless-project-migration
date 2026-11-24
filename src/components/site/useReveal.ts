import { useEffect, useRef } from "react";

/**
 * Cinematic reveal for any element carrying [data-reveal] inside the returned ref.
 * GSAP + ScrollTrigger are loaded lazily on the client; reduced-motion users get no motion.
 */
export function useReveal<T extends HTMLElement>(opts: { stagger?: number; y?: number } = {}) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;
    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        const els = root.querySelectorAll<HTMLElement>("[data-reveal]");
        gsap.fromTo(
          els,
          { opacity: 0, y: opts.y ?? 28, filter: "blur(6px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.1,
            ease: "expo.out",
            stagger: opts.stagger ?? 0.08,
            scrollTrigger: { trigger: root, start: "top 85%" },
          },
        );
      }, root);
    })();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [opts.stagger, opts.y]);
  return ref;
}
