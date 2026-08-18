import { createFileRoute } from "@tanstack/react-router";

import { Dashboard } from "@/components/bestreads/Dashboard";
import { Landing } from "@/components/bestreads/Landing";
import { Toaster } from "@/components/ui/sonner";
import { BestreadsProvider, useBestreads } from "@/lib/bestreads/store";

const title = "Bestreads — The front page of 100% human-written books";
const description =
  "Discover books, poetry and texts written entirely by people. Upvote-ranked, zero-toxicity, strictly no AI.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Shell() {
  const { user } = useBestreads();
  return user ? <Dashboard /> : <Landing />;
}


function Index() {
  return (
    <BestreadsProvider>
      <Shell />
      <Toaster />
    </BestreadsProvider>
  );
}
