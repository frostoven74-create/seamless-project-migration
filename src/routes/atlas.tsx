import { createFileRoute } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/PageIntro";

export const Route = createFileRoute("/atlas")({
  head: () => ({
    meta: [
      { title: "Earth Atlas — EARTH//OS" },
      { name: "description", content: "Earth Atlas on EARTH//OS. This section is still being built." },
      { property: "og:title", content: "Earth Atlas — EARTH//OS" },
      { property: "og:description", content: "Earth Atlas on EARTH//OS. This section is still being built." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PageIntro index="—" eyebrow="Earth Atlas" title="Earth Atlas" lede="This section is still being built. Its rules and data are ready; the screens come next." />,
});
