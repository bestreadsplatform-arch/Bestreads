import { useState } from "react";
import { Lock, Trash2, Upload } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { BookCover } from "./BookCover";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { dailySeries, hourlySeries, type Book } from "@/lib/bestreads/data";
import { useBestreads } from "@/lib/bestreads/store";
import { cn } from "@/lib/utils";

function FreeChart({ book }: { book: Book }) {
  const data = [
    { label: "Views", value: book.views },
    { label: "Upvotes", value: book.totalUpvotes },
    { label: "Shares", value: book.shares },
  ];
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Lifetime totals</h3>
        <span className="text-xs text-muted-foreground">
          since {new Date(book.launchDate).toLocaleDateString()}
        </span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Free tier shows one static 3-pillar chart. Pro unlocks time-sliced line graphs.
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} />
          <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
          <Tooltip
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
            }}
          />
          <Bar dataKey="value" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProChart({ book }: { book: Book }) {
  const [range, setRange] = useState<"today" | "week" | "month">("today");
  const data =
    range === "today" ? hourlySeries(book) : dailySeries(book, range === "week" ? 7 : 30);
  return (
    <div className="rounded-xl border border-gold bg-card p-5 shadow-lift">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold">Pro analytics engine</h3>
        <Tabs value={range} onValueChange={(v) => setRange(v as typeof range)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        {range === "today"
          ? "Hour-by-hour since 00:00 CEST"
          : range === "week"
            ? "Day-by-day since Monday 00:00 CEST"
            : "Day-by-day since the 1st, 00:00 CEST"}
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={11} />
          <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
          <Tooltip
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
            }}
          />
          <Line type="monotone" dataKey="reads" stroke="var(--color-chart-1)" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="currentReads" stroke="var(--color-chart-2)" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="upvotes" stroke="var(--color-chart-3)" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey="shares" stroke="var(--color-chart-4)" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        {[
          ["Reads", "chart-1"],
          ["Current Reads", "chart-2"],
          ["Upvotes", "chart-3"],
          ["Shares", "chart-4"],
        ].map(([label, token]) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: `var(--color-${token})` }}
            />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Bookshelf() {
  const { books, drafts, user, setView, deleteDraft, publishDraft, library } = useBestreads();
  const published = books.filter((b) => b.authorId === user?.id && b.status === "published");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = published.find((b) => b.id === selectedId) ?? published[0] ?? null;
  const setSelected = (b: Book) => setSelectedId(b.id);
  const openDrafts = drafts.filter((d) => d.status === "draft");

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      <header className="py-8">
        <h1 className="font-display text-4xl font-semibold">Your Bookshelf</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {openDrafts.length} draft{openDrafts.length === 1 ? "" : "s"} · {published.length}{" "}
          published · {library.length} saved in library
        </p>
      </header>

      <Tabs defaultValue="studio" className="mb-8">
        <TabsList>
          <TabsTrigger value="studio">Studio</TabsTrigger>
          <TabsTrigger value="saved">Saved for Later</TabsTrigger>
        </TabsList>

        <TabsContent value="studio" className="mt-6 space-y-10">

      <section className="mb-10">
        <h2 className="mb-3 text-xs font-semibold tracking-[0.2em] uppercase">Drafts</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {openDrafts.map((d) => (
            <div key={d.id} className="flex gap-3 rounded-lg border border-border bg-card p-3">
              <div className="w-12 shrink-0">
                <BookCover title={d.title} cover={d.cover} image={d.coverImage} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display truncate text-base font-semibold">{d.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{d.summary}</p>
                <div className="mt-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      void publishDraft(d.id).then((res) => {
                        if (res.ok) toast.success("Published to Bestreads");
                        else toast.error(res.error ?? "Could not publish");
                      });
                    }}
                  >
                    <Upload className="size-3" /> Publish
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteDraft(d.id)}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {openDrafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No drafts yet.</p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <div>
          <h2 className="mb-3 text-xs font-semibold tracking-[0.2em] uppercase">Published</h2>
          <div className="space-y-2">
            {published.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelected(b)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border border-border bg-card p-2 text-left transition-colors hover:bg-accent",
                  selected?.id === b.id && "ring-2 ring-ring",
                )}
              >
                <div className="w-9 shrink-0">
                  <BookCover title={b.title} cover={b.cover} image={b.coverImage} />
                </div>
                <span className="font-display truncate text-sm font-semibold">{b.title}</span>
              </button>
            ))}
          </div>
        </div>

        {!selected ? (
          <p className="text-sm text-muted-foreground">
            Publish a book to see its analytics here.
          </p>
        ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

            {[
              ["Views", selected.views],
              ["Upvotes", selected.totalUpvotes],
              ["Shares", selected.shares],
              ["Current reads", selected.currentReads],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-border bg-card p-3">
                <p className="text-[0.65rem] tracking-widest text-muted-foreground uppercase">
                  {label}
                </p>
                <p className="text-metric text-2xl font-semibold">
                  {Number(value).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {user?.isPro ? (
            <ProChart book={selected} />
          ) : (
            <>
              <FreeChart book={selected} />
              <div className="flex items-center justify-between rounded-xl border border-dashed border-gold bg-gold/10 p-4">
                <p className="inline-flex items-center gap-2 text-sm">
                  <Lock className="size-4" /> Today / Week / Month line graphs are Pro.
                </p>
                <Button size="sm" onClick={() => setView("pricing")}>
                  Unlock Pro
                </Button>
              </div>
            </>
          )}
        </div>
        )}
      </section>
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          {library.length === 0 ? (
            <p className="text-sm text-muted-foreground">Your library is empty.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {books
                .filter((b) => library.includes(b.id))
                .map((b) => (
                  <div key={b.id} className="group flex flex-col gap-2">
                    <button
                      className="block transition-transform group-hover:-translate-y-1 duration-300 text-left"
                    >
                      <BookCover title={b.title} cover={b.cover} image={b.coverImage} />
                    </button>
                    <p className="font-display truncate text-sm font-semibold mt-2">{b.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{b.summary}</p>
                  </div>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>


    </div>
  );
}
