import { createFileRoute } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/PageIntro";

export const Route = createFileRoute("/passports/$id")({
  head: () => ({
    meta: [
      { title: "Solution Passport — EARTH//OS" },
      { name: "description", content: "Solution Passport on EARTH//OS. This section is still being built." },
      { property: "og:title", content: "Solution Passport — EARTH//OS" },
      { property: "og:description", content: "Solution Passport on EARTH//OS. This section is still being built." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PageIntro index="—" eyebrow="Solution Passport" title="Solution Passport" lede="This section is still being built. Its rules and data are ready; the screens come next." />,
});
