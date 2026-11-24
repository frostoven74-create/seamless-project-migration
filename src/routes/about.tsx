import { createFileRoute } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/PageIntro";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — EARTH//OS" },
      { name: "description", content: "About on EARTH//OS. This section is still being built." },
      { property: "og:title", content: "About — EARTH//OS" },
      { property: "og:description", content: "About on EARTH//OS. This section is still being built." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PageIntro index="—" eyebrow="About" title="About" lede="This section is still being built. Its rules and data are ready; the screens come next." />,
});
