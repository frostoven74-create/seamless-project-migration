import { createFileRoute } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/PageIntro";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — EARTH//OS" },
      { name: "description", content: "Projects on EARTH//OS. This section is still being built." },
      { property: "og:title", content: "Projects — EARTH//OS" },
      { property: "og:description", content: "Projects on EARTH//OS. This section is still being built." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PageIntro index="—" eyebrow="Projects" title="Projects" lede="This section is still being built. Its rules and data are ready; the screens come next." />,
});
