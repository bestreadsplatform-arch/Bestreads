import { useEffect, useState } from "react";
import {
  ArrowBigUp,
  BadgeCheck,
  BookMarked,
  Crown,
  Filter,
  Flag,
  Library,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Rows3,
  Search,
  Share2,
  Sparkles,
  Timer,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { BookCover } from "./BookCover";
import { Bookshelf } from "./Bookshelf";
import { HallOfFame } from "./HallOfFame";
import { Pricing } from "./Pricing";
import { ProfilePage } from "./ProfilePage";
import { ReadingModal } from "./ReadingModal";
import { Studio } from "./Studio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  authorById,
  formatCountdown,
  nextReset,
  poolStart,
  type Book,
  type TimeFilter,
} from "@/lib/bestreads/data";
import { useBestreads, type View } from "@/lib/bestreads/store";
import { cn } from "@/lib/utils";

const FILTERS: { key: TimeFilter; label: string }[] = [
  { key: "today", label: "Trending Today" },
  { key: "week", label: "Trending Week" },
  { key: "month", label: "Trending Month" },
];

function ResetClock() {
  const { filter } = useBestreads();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const reset = nextReset(filter, new Date(now));
  const start = poolStart(filter, new Date(now));
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="inline-flex items-center gap-1.5 text-[0.65rem] tracking-[0.2em] text-muted-foreground uppercase">
        <Timer className="size-3.5" /> Pool resets in
      </p>
      <p className="text-metric mt-1 text-2xl font-semibold">
        {formatCountdown(reset.getTime() - now)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Counting upvotes since {start.toLocaleString("en-GB", { timeZone: "UTC" })} UTC · 00:00 CEST
      </p>
    </div>
  );
}

function StoreLinks({ book }: { book: Book }) {
  const { user } = useBestreads();
  if (!book.store) return null;
  const entries = Object.entries(book.store) as [string, string][];
  if (user?.tier === "pro") {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {entries.map(([name, href]) => (
          <a
            key={name}
            href={href}
            onClick={(e) => e.preventDefault()}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-lift transition-transform hover:-translate-y-0.5"
          >
            <Sparkles className="size-3.5" /> Buy on {name}
          </a>
        ))}
      </div>
    );
  }
  return (
    <p className="mt-3 text-xs text-muted-foreground">
      {entries.map(([name], i) => (
        <span key={name}>
          {i > 0 && " · "}
          <a href="#" onClick={(e) => e.preventDefault()} className="underline">
            {name}
          </a>
        </span>
      ))}
    </p>
  );
}

function UpvoteButton({ book }: { book: Book }) {
  const { upvoted, toggleUpvote, upvoteCount } = useBestreads();
  const on = upvoted.includes(book.id);
  return (
    <button
      onClick={() => toggleUpvote(book.id)}
      className={cn(
        "flex w-14 shrink-0 flex-col items-center rounded-lg border border-border py-2 transition-colors",
        on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
      )}
    >
      <ArrowBigUp className={cn("size-5", on && "fill-current")} />
      <span className="text-metric text-sm font-semibold">{upvoteCount(book)}</span>
      <span className="text-[0.55rem] tracking-widest uppercase opacity-70">
        {on ? "voted" : "vote"}
      </span>
    </button>
  );
}

function StreamCard({ book }: { book: Book }) {
  const { following, toggleFollow, library, toggleLibrary, openReading, openProfile } = useBestreads();
  const author = authorById(book.authorId);
  const saved = library.includes(book.id);
  return (
    <article className="flex gap-4 border-b border-border px-4 py-5 transition-colors hover:bg-card/60">
      <UpvoteButton book={book} />
      <button onClick={() => openReading(book)} className="w-14 shrink-0 hover:opacity-80 transition-opacity">
        <BookCover title={book.title} cover={book.cover} image={book.coverImage} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 text-sm">
          <button onClick={() => openProfile(author.id)} className="font-semibold hover:underline">
            {author.name}
          </button>
          <button onClick={() => openProfile(author.id)} className="text-muted-foreground hover:underline">
            @{author.username}
          </button>
          <BadgeCheck className="size-3.5 text-verified" />
          <span className="text-metric text-xs text-muted-foreground">{book.pages} pages</span>
        </div>
        <button
          onClick={() => openReading(book)}
          className="font-display mt-1 text-xl font-semibold hover:underline text-left"
        >
          {book.title}
        </button>
        <p className="mt-1 text-sm text-muted-foreground">{book.summary}</p>
        <p className="mt-2 text-xs tracking-wide text-muted-foreground">
          {book.hashtags.join("  ")}
        </p>
        <StoreLinks book={book} />
        <div className="mt-3 flex flex-wrap gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toast.success("Share link copied")}
          >
            <Share2 className="size-3.5" /> Share
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toggleFollow(author.id)}>
            <UserPlus className="size-3.5" />
            {following.includes(author.id) ? "Following" : `Follow @${author.username}`}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const res = toggleLibrary(book.id);
              if (!res.ok) toast.error(res.error ?? "");
              else toast(saved ? "Removed from library" : "Saved to library");
            }}
          >
            <BookMarked className={cn("size-3.5", saved && "fill-current")} />
            {saved ? "Saved" : "Save"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => toast.success("Sent to the human moderation board")}
          >
            <Flag className="size-3.5" /> Report
          </Button>
        </div>
      </div>
    </article>
  );
}

function Discover() {
  const {
    filter,
    setFilter,
    genreSlots,
    setGenreSlot,
    availableGenres,
    activeGenre,
    setActiveGenre,
    topTen,
    topTenCollapsed,
    streamBooks,
    feedTab,
    setFeedTab,
    hashtagSearch,
    user,
    maxPages,
    setMaxPages,
    setView,
  } = useBestreads();

  const showTopTen = !topTenCollapsed && !hashtagSearch;

  return (
    <div className="px-4 pb-24">
      <div className="flex flex-wrap items-center gap-2 py-5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border border-border px-4 py-1.5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors",
              filter === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:bg-accent",
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        {genreSlots.map((slot, i) => (
          <div key={i} className="flex items-center gap-1">
            <Select
              value={slot ?? ""}
              onValueChange={(v) => {
                setGenreSlot(i, v);
                setActiveGenre(v);
              }}
            >
              <SelectTrigger
                className={cn(
                  "h-8 w-36 text-xs",
                  activeGenre === slot && slot && "border-primary bg-accent",
                )}
              >
                <SelectValue placeholder={`Genre slot ${i + 1}`} />
              </SelectTrigger>
              <SelectContent>
                {availableGenres.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        {activeGenre ? (
          <Button size="sm" variant="ghost" onClick={() => setActiveGenre(null)}>
            Clear genre
          </Button>
        ) : null}
      </div>

      {user?.tier === "pro" ? (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-gold bg-gold/10 p-3 text-xs">
          <Filter className="size-4" /> Pro filters
          <Button
            size="sm"
            variant={maxPages === 50 ? "default" : "outline"}
            onClick={() => setMaxPages(maxPages === 50 ? null : 50)}
          >
            Under 50 pages
          </Button>
          <Button
            size="sm"
            variant={maxPages === 150 ? "default" : "outline"}
            onClick={() => setMaxPages(maxPages === 150 ? null : 150)}
          >
            Under 150 pages
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setView("pricing")}
          className="mb-6 block w-full rounded-lg border border-dashed border-border bg-card p-3 text-left text-xs text-muted-foreground hover:bg-accent"
        >
          Advanced sorting (length, upvote thresholds) is a Pro filter — upgrade to unlock.
        </button>
      )}

      {hashtagSearch ? (
        <p className="mb-4 text-xs text-muted-foreground">
          Hashtag search active for <strong>{hashtagSearch}</strong> — Top 10 grid hidden.
        </p>
      ) : null}

      {showTopTen ? (
        <section className="mb-10">
          <h2 className="font-display mb-4 text-2xl font-semibold">
            Top 10 · {FILTERS.find((f) => f.key === filter)?.label}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {topTen.map((b, i) => (
              <div key={b.id} className="group">
                <div className="relative">
                  <BookCover
                    title={b.title}
                    author={authorById(b.authorId).name}
                    cover={b.cover}
                    className="transition-transform duration-300 group-hover:-translate-y-1"
                  />
                  <span className="text-metric absolute -top-3 -left-2 rounded-full border border-border bg-card px-2.5 py-1 text-sm font-semibold shadow-soft">
                    {i + 1}
                  </span>
                </div>
                <div className="mt-2 flex items-start gap-2">
                  <UpvoteButton book={b} />
                  <div className="min-w-0">
                    <p className="font-display truncate text-sm font-semibold">{b.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{authorById(b.authorId).username}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-border bg-card/40">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <Tabs value={feedTab} onValueChange={(v) => setFeedTab(v as "for-you" | "following")}>
            <TabsList>
              <TabsTrigger value="for-you">For You</TabsTrigger>
              <TabsTrigger value="following">Following</TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Zero-toxicity stream · no comments, no likes, no dislikes
          </p>
        </div>
        {streamBooks.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nothing here yet. Follow a few writers to fill this feed.
          </p>
        ) : (
          streamBooks.map((b) => <StreamCard key={b.id} book={b} />)
        )}
      </section>
    </div>
  );
}

function LeftSidebar() {
  const { sidebarOpen, toggleSidebar, view, setView, topTenCollapsed, toggleTopTen, user, library } =
    useBestreads();
  const items: { key: View; label: string; icon: typeof Library }[] = [
    { key: "discover", label: "Discover", icon: Rows3 },
    { key: "bookshelf", label: "Bookshelf", icon: Library },
    { key: "studio", label: "Writer Studio", icon: PenLine },
    { key: "hall-of-fame", label: "Hall of Fame", icon: Crown },
    { key: "pricing", label: "Subscription", icon: Sparkles },
  ];
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-300 md:block",
        sidebarOpen ? "w-56" : "w-16",
      )}
    >
      <div className="flex h-full flex-col gap-1 p-3">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mb-2 self-start">
          {sidebarOpen ? (
            <PanelLeftClose className="size-4" />
          ) : (
            <PanelLeftOpen className="size-4" />
          )}
        </Button>
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => setView(it.key)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              view === it.key
                ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                : "hover:bg-sidebar-accent/60",
            )}
          >
            <it.icon className="size-4 shrink-0" />
            {sidebarOpen ? it.label : null}
          </button>
        ))}
        <div className="mt-4 border-t border-sidebar-border pt-4">
          <button
            onClick={toggleTopTen}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent/60"
          >
            <Rows3 className="size-4 shrink-0" />
            {sidebarOpen ? (topTenCollapsed ? "Expand Top 10" : "Compress Top 10") : null}
          </button>
        </div>
        {sidebarOpen ? (
          <p className="mt-auto text-xs text-muted-foreground">
            Library {library.length}
            {user?.tier === "free" ? "/5" : " · unlimited"}
          </p>
        ) : null}
      </div>
    </aside>
  );
}

function RightSidebar() {
  const { topAuthors, filter, following, toggleFollow } = useBestreads();
  const label = FILTERS.find((f) => f.key === filter)?.label;
  return (
    <aside className="hidden w-72 shrink-0 border-l border-border px-4 py-5 xl:block">
      <div className="sticky top-5 space-y-4">
        <ResetClock />
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-display text-lg font-semibold">Top Authors</h3>
          <p className="mb-3 text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
            Multi-sum · {label}
          </p>
          <ol className="space-y-3">
            {topAuthors.slice(0, 8).map((a, i) => (
              <li key={a.author.id} className="flex items-center gap-3">
                <span className="text-metric w-4 text-xs text-muted-foreground">{i + 1}</span>
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                  {a.author.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.author.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{a.author.username} · {a.titles} titles
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-metric text-sm font-semibold">{a.score}</p>
                  <button
                    onClick={() => toggleFollow(a.author.id)}
                    className="text-[0.6rem] tracking-wide text-muted-foreground uppercase hover:text-foreground"
                  >
                    {following.includes(a.author.id) ? "following" : "follow"}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
          Sums every upvote across an author's catalogue inside the active CEST window.
        </p>
      </div>
    </aside>
  );
}

function Header() {
  const { search, setSearch, user, setView, signOut, openProfile } = useBestreads();
  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
      <button onClick={() => setView("discover")} className="font-display text-xl font-semibold">
        Bestreads
      </button>
      <div className="relative min-w-48 flex-1">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search titles, text content or #POETRY…"
          className="bg-card pl-9"
        />
      </div>
      <Button onClick={() => setView("studio")}>
        <PenLine className="size-4" /> Write Something Human
      </Button>
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1">
        <button
          onClick={() => { if (user) openProfile(user.id); }}
          className="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground hover:ring-2 hover:ring-ring transition-all"
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" className="size-full rounded-full object-cover" />
          ) : (
            user?.name?.[0] ?? "?"
          )}
        </button>
        <div className="hidden sm:block">
          <p className="text-xs leading-tight font-semibold">@{user?.username}</p>
          <p className="text-[0.6rem] tracking-widest text-muted-foreground uppercase">
            {user?.tier} tier
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} className="ml-1">
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}

export function Dashboard() {
  const { view } = useBestreads();
  return (
    <div className="flex min-h-screen bg-background">
      <LeftSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <div className="flex min-w-0 flex-1">
          <main className="min-w-0 flex-1">
            {view === "discover" ? <Discover /> : null}
            {view === "studio" ? <Studio /> : null}
            {view === "bookshelf" ? <Bookshelf /> : null}
            {view === "hall-of-fame" ? <HallOfFame /> : null}
            {view === "pricing" ? <Pricing /> : null}
          </main>
          {view === "discover" ? <RightSidebar /> : null}
        </div>
      </div>
      <ReadingModal />
      <ProfilePage />
    </div>
  );
}
