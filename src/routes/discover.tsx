import { createFileRoute } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/PageIntro";

export const Route = createFileRoute("/discover")({
  head: () => ({
    meta: [
      { title: "Discover — EARTH//OS" },
      { name: "description", content: "Discover on EARTH//OS. This section is still being built." },
      { property: "og:title", content: "Discover — EARTH//OS" },
      { property: "og:description", content: "Discover on EARTH//OS. This section is still being built." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PageIntro index="—" eyebrow="Discover" title="Discover" lede="This section is still being built. Its rules and data are ready; the screens come next." />,
});
