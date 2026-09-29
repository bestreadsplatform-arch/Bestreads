import { useEffect, useMemo, useState } from "react";
import { X, ArrowBigUp, ArrowLeft, ArrowRight, BookMarked } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authorById } from "@/lib/bestreads/data";
import { useBestreads } from "@/lib/bestreads/store";
import { cn } from "@/lib/utils";

export function ReadingModal() {
  const { readingBook, closeReading, upvoted, toggleUpvote, library, toggleLibrary } =
    useBestreads();

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeReading();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeReading]);

  const book = readingBook;
  const paragraphs = useMemo(
    () => (book ? (book.content || book.excerpt || "").split(/\n{2,}/).filter(Boolean) : []),
    [book],
  );
  const pagePairs = useMemo(() => {
    const pages: string[][] = [];
    for (let i = 0; i < paragraphs.length; i += 2) pages.push(paragraphs.slice(i, i + 2));
    return pages.length ? pages : [["No content available for this text."]];
  }, [paragraphs]);
  const [pageIndex, setPageIndex] = useState(0);

  if (!book) return null;

  const author = authorById(book.authorId);
  const isUpvoted = upvoted.includes(book.id);
  const isSaved = library.includes(book.id);
  const currentPair = pagePairs[pageIndex] ?? pagePairs[0]!;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: "oklch(0.98 0.01 85)" }}
      role="dialog"
      aria-modal="true"
      aria-label={`Reading: ${book.title}`}
    >
      {/* Toolbar */}
      <header
        className="flex shrink-0 items-center justify-between px-6 py-3"
        style={{ borderBottom: "1px solid oklch(0.88 0.02 85)", background: "oklch(0.99 0.005 85)" }}
      >
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="icon" onClick={closeReading} aria-label="Close reader">
            <X className="size-5" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{book.title}</p>
            <p className="text-xs text-muted-foreground">@{author.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => toggleUpvote(book.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              isUpvoted
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-accent",
            )}
          >
            <ArrowBigUp className={cn("size-4", isUpvoted && "fill-current")} />
            {book.totalUpvotes}
          </button>
          <button
            onClick={() => {
              const res = toggleLibrary(book.id);
              if (!res.ok) toast.error(res.error ?? "");
              else toast(isSaved ? "Removed from library" : "Saved for later");
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              isSaved
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-accent",
            )}
          >
            <BookMarked className={cn("size-3.5", isSaved && "fill-current")} />
            {isSaved ? "Saved" : "Save for Later"}
          </button>
          {book.buyLink && (
            <a
              href={book.buyLink}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-4 py-1 text-xs font-semibold transition-all",
                author.isPro
                  ? "bg-primary text-primary-foreground shadow-lift hover:-translate-y-px"
                  : "text-primary underline",
              )}
            >
              Buy book ↗
            </a>
          )}
        </div>
      </header>

      {/* Reading area */}
      <div className="flex-1 overflow-y-auto">
        <article className="mx-auto max-w-[680px] px-6 py-14">
          {/* Title block */}
          <header className="mb-10 pb-8" style={{ borderBottom: "1px solid oklch(0.88 0.02 85)" }}>
            <h1
              className="text-4xl leading-tight tracking-tight"
              style={{
                fontFamily: "'Georgia', 'Palatino Linotype', serif",
                color: "oklch(0.18 0.02 60)",
              }}
            >
              {book.title}
            </h1>
            {book.summary && (
              <p
                className="mt-4 text-lg italic leading-relaxed"
                style={{ fontFamily: "'Georgia', serif", color: "oklch(0.45 0.03 60)" }}
              >
                {book.summary}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{author.name}</span>
              <span>@{author.username}</span>
              <span>·</span>
              <span>
                {book.pages} {book.pages === 1 ? "page" : "pages"}
              </span>
              <span>·</span>
              <span>
                {new Date(book.launchDate).toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            {book.hashtags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {book.hashtags.map((h) => (
                  <span
                    key={h}
                    className="rounded-full px-2.5 py-0.5 text-xs text-muted-foreground"
                    style={{ background: "oklch(0.93 0.02 85)" }}
                  >
                    {h}
                  </span>
                ))}
              </div>
            )}
          </header>

          <div className="relative grid gap-5 md:grid-cols-2" style={{ perspective: "1800px" }}>
            {currentPair.map((para, i) => (
              <section key={`${pageIndex}-${i}`} className="min-h-[32rem] rounded-sm border border-border/80 bg-[#fffdf8] p-8 shadow-[0_12px_30px_-18px_rgba(40,24,12,0.55)]" style={{ fontFamily: "'Georgia', 'Palatino Linotype', 'Times New Roman', serif", fontSize: "1.0625rem", lineHeight: "1.9", color: "oklch(0.2 0.02 60)", wordSpacing: "0.025em" }}>
                <p>{para}</p>
                <div className="mt-12 border-t border-border/70 pt-3 text-center text-[0.65rem] tracking-[0.2em] text-muted-foreground">{pageIndex * 2 + i + 1}</div>
              </section>
            ))}
            <Button variant="outline" size="icon" className="absolute -left-5 top-1/2 rounded-full bg-background shadow-sm" onClick={() => setPageIndex((value) => Math.max(0, value - 1))} disabled={pageIndex === 0} aria-label="Previous spread"><ArrowLeft /></Button>
            <Button variant="outline" size="icon" className="absolute -right-5 top-1/2 rounded-full bg-background shadow-sm" onClick={() => setPageIndex((value) => Math.min(pagePairs.length - 1, value + 1))} disabled={pageIndex === pagePairs.length - 1} aria-label="Next spread"><ArrowRight /></Button>
          </div>
          <div className="mt-5 flex items-center justify-center gap-3 text-xs text-muted-foreground"><span>Spread {pageIndex + 1} of {pagePairs.length}</span><span aria-hidden="true">·</span><span>Use the arrows to turn the page</span></div>

          {/* Footer */}
          <footer
            className="mt-16 pt-8 text-center text-xs text-muted-foreground"
            style={{ borderTop: "1px solid oklch(0.88 0.02 85)" }}
          >
            <p>
              — End of &ldquo;{book.title}&rdquo; by {author.name} —
            </p>
            <p className="mt-1">100% human-written · Verified on Bestreads</p>
          </footer>
        </article>
      </div>
    </div>
  );
}
