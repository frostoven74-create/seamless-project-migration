import { createFileRoute } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/PageIntro";

export const Route = createFileRoute("/projects/$id")({
  head: () => ({
    meta: [
      { title: "Project — EARTH//OS" },
      { name: "description", content: "Project on EARTH//OS. This section is still being built." },
      { property: "og:title", content: "Project — EARTH//OS" },
      { property: "og:description", content: "Project on EARTH//OS. This section is still being built." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PageIntro index="—" eyebrow="Project" title="Project" lede="This section is still being built. Its rules and data are ready; the screens come next." />,
});
