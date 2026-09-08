import { useState } from "react";
import { ArrowLeft, Edit2, ExternalLink, BookOpen } from "lucide-react";
import { toast } from "sonner";

import { BookCover } from "./BookCover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authorById } from "@/lib/bestreads/data";
import { useBestreads } from "@/lib/bestreads/store";
import { cn } from "@/lib/utils";

type SortKey = "most-voted" | "oldest" | "newest";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "most-voted", label: "Most Voted" },
  { key: "newest", label: "Most Recent" },
  { key: "oldest", label: "Oldest" },
];

export function ProfilePage() {
  const {
    viewProfileId,
    closeProfile,
    books,
    user,
    filter,
    openReading,
    updateProfile,
  } = useBestreads();

  const [sort, setSort] = useState<SortKey>("most-voted");
  const [editOpen, setEditOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editGumroad, setEditGumroad] = useState("");
  const [editAmazon, setEditAmazon] = useState("");
  const [editTwitter, setEditTwitter] = useState("");
  const [saving, setSaving] = useState(false);

  if (!viewProfileId) return null;

  const author = authorById(viewProfileId);
  const isOwner = user?.id === viewProfileId;

  // Gather this author's published books
  let authorBooks = books.filter(
    (b) => b.authorId === viewProfileId && b.status === "published",
  );

  if (sort === "most-voted") {
    authorBooks = [...authorBooks].sort((a, b) => b.upvotes[filter] - a.upvotes[filter]);
  } else if (sort === "newest") {
    authorBooks = [...authorBooks].sort(
      (a, b) => new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime(),
    );
  } else {
    authorBooks = [...authorBooks].sort(
      (a, b) => new Date(a.launchDate).getTime() - new Date(b.launchDate).getTime(),
    );
  }

  // Render books in blocks of 3
  const rows: (typeof authorBooks)[] = [];
  for (let i = 0; i < authorBooks.length; i += 3) {
    rows.push(authorBooks.slice(i, i + 3));
  }

  const openEdit = () => {
    setEditName(author.name ?? "");
    setEditBio(author.bio ?? "");
    setEditAvatar(author.avatarUrl ?? "");
    setEditGumroad(author.links?.gumroad ?? "");
    setEditAmazon(author.links?.amazon ?? "");
    setEditTwitter(author.links?.twitter ?? "");
    setEditOpen(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    const res = await updateProfile({
      name: editName,
      avatarUrl: editAvatar,
      bio: editBio,
      links: {
        gumroad: editGumroad || undefined,
        amazon: editAmazon || undefined,
        twitter: editTwitter || undefined,
      },
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Profile updated");
      setEditOpen(false);
    } else {
      toast.error(res.error ?? "Could not save profile");
    }
  };

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-background">
      <div className="mx-auto max-w-4xl px-4 pb-24">
        {/* Back bar */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 py-3 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={closeProfile} aria-label="Back">
            <ArrowLeft className="size-4" />
          </Button>
          <span className="text-sm font-semibold">@{author.username}</span>
        </div>

        {/* Profile header */}
        <header className="flex flex-col gap-5 py-10 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="shrink-0">
            {author.avatarUrl ? (
              <img
                src={author.avatarUrl}
                alt={author.name}
                className="size-24 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="flex size-24 items-center justify-center rounded-full bg-accent text-2xl font-semibold text-accent-foreground">
                {author.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-semibold">{author.name}</h1>
              {author.isPro && (
                <span className="rounded-full border border-gold bg-gold/10 px-2.5 py-0.5 text-xs font-semibold text-gold-foreground">
                  Pro
                </span>
              )}
              {isOwner && (
                <Button size="sm" variant="outline" onClick={openEdit}>
                  <Edit2 className="size-3.5" /> Edit Profile
                </Button>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">@{author.username}</p>
            {author.bio && (
              <p className="mt-3 text-sm leading-relaxed">{author.bio}</p>
            )}

            {/* External links */}
            {author.links && (
              <div className="mt-4 flex flex-wrap gap-3">
                {author.links.gumroad && (
                  author.isPro ? (
                    <a
                      href={author.links.gumroad}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-lift transition-transform hover:-translate-y-0.5"
                    >
                      <ExternalLink className="size-3" /> Gumroad
                    </a>
                  ) : (
                    <a
                      href={author.links.gumroad}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary underline"
                    >
                      Gumroad ↗
                    </a>
                  )
                )}
                {author.links.amazon && (
                  author.isPro ? (
                    <a
                      href={author.links.amazon}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-lift transition-transform hover:-translate-y-0.5"
                    >
                      <ExternalLink className="size-3" /> Amazon
                    </a>
                  ) : (
                    <a
                      href={author.links.amazon}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary underline"
                    >
                      Amazon ↗
                    </a>
                  )
                )}
                {author.links.twitter && (
                  <a
                    href={author.links.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline"
                  >
                    Twitter / X ↗
                  </a>
                )}
              </div>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              {authorBooks.length} publication{authorBooks.length !== 1 ? "s" : ""}
            </p>
          </div>
        </header>

        {/* Sort toggles */}
        <div className="mb-6 flex items-center gap-2">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSort(opt.key)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors",
                sort === opt.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-accent",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Books grid — blocks of 3 */}
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No published books yet.
          </p>
        ) : (
          <div className="space-y-8">
            {rows.map((row, ri) => (
              <div key={ri} className="grid grid-cols-3 gap-4 sm:gap-6">
                {row.map((b) => (
                  <div key={b.id} className="group flex flex-col gap-2">
                    <button
                      className="block transition-transform group-hover:-translate-y-1 duration-300"
                      onClick={() => openReading(b)}
                      aria-label={`Read ${b.title}`}
                    >
                      <BookCover title={b.title} cover={b.cover} image={b.coverImage} />
                    </button>
                    <p className="font-display truncate text-sm font-semibold">{b.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{b.summary}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{b.totalUpvotes} upvotes</span>
                      <button
                        onClick={() => openReading(b)}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <BookOpen className="size-3" /> Read
                      </button>
                    </div>
                  </div>
                ))}
                {/* Fill empty slots in last row */}
                {row.length < 3 &&
                  Array.from({ length: 3 - row.length }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Profile Panel — slide-over */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setEditOpen(false)}
          />
          <aside className="relative flex h-full w-full max-w-sm flex-col gap-5 overflow-y-auto border-l border-border bg-card p-6 shadow-lift">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Edit Profile</h2>
              <Button variant="ghost" size="icon" onClick={() => setEditOpen(false)}>
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-xs">Display Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Avatar Image URL</Label>
                <Input
                  value={editAvatar}
                  onChange={(e) => setEditAvatar(e.target.value)}
                  placeholder="https://…"
                />
                {editAvatar && (
                  <img
                    src={editAvatar}
                    alt="Preview"
                    className="mt-2 size-14 rounded-full object-cover ring-1 ring-border"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                )}
              </div>
              <div>
                <Label className="text-xs">Bio</Label>
                <Textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  placeholder="A few words about you…"
                  className="resize-none"
                />
              </div>

              <p className="text-[0.7rem] font-semibold tracking-widest text-muted-foreground uppercase">
                Storefront Links
              </p>
              <div>
                <Label className="text-xs">Gumroad</Label>
                <Input
                  value={editGumroad}
                  onChange={(e) => setEditGumroad(e.target.value)}
                  placeholder="https://yourname.gumroad.com"
                />
              </div>
              <div>
                <Label className="text-xs">Amazon Author Page</Label>
                <Input
                  value={editAmazon}
                  onChange={(e) => setEditAmazon(e.target.value)}
                  placeholder="https://amazon.com/author/…"
                />
              </div>
              <div>
                <Label className="text-xs">Twitter / X</Label>
                <Input
                  value={editTwitter}
                  onChange={(e) => setEditTwitter(e.target.value)}
                  placeholder="https://x.com/yourhandle"
                />
              </div>
            </div>

            <Button
              className="mt-auto w-full"
              onClick={() => void saveProfile()}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Profile"}
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
