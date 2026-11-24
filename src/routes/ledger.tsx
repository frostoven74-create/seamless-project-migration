import { createFileRoute } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/PageIntro";

export const Route = createFileRoute("/ledger")({
  head: () => ({
    meta: [
      { title: "Impact Ledger — EARTH//OS" },
      { name: "description", content: "Impact Ledger on EARTH//OS. This section is still being built." },
      { property: "og:title", content: "Impact Ledger — EARTH//OS" },
      { property: "og:description", content: "Impact Ledger on EARTH//OS. This section is still being built." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PageIntro index="—" eyebrow="Impact Ledger" title="Impact Ledger" lede="This section is still being built. Its rules and data are ready; the screens come next." />,
});
