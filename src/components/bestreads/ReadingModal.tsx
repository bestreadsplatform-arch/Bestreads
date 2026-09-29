import { useEffect, useMemo, useState } from "react";
import { X, ArrowBigUp, ArrowLeft, ArrowRight, BookMarked, Maximize2, Minimize2 } from "lucide-react";
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
    const pageSize = 980;
    const pages: string[] = [];
    let current = "";
    for (const paragraph of paragraphs) {
      const next = current ? `${current}\n\n${paragraph}` : paragraph;
      if (current && next.length > pageSize) {
        pages.push(current);
        current = paragraph;
      } else {
        current = next;
      }
    }
    if (current) pages.push(current);
    const safePages = pages.length ? pages : ["No content available for this text."];
    if (safePages.length % 2) safePages.push("");
    const pairs: string[][] = [];
    for (let i = 0; i < safePages.length; i += 2) pairs.push(safePages.slice(i, i + 2));
    return pairs;
  }, [paragraphs]);
  const [pageIndex, setPageIndex] = useState(0);
  const [bookOnly, setBookOnly] = useState(false);
  const [turning, setTurning] = useState(false);

  useEffect(() => {
    setPageIndex(0);
  }, [book?.id]);

  const turnPage = (direction: 1 | -1) => {
    if (turning) return;
    const next = Math.max(0, Math.min(pagePairs.length - 1, pageIndex + direction));
    if (next === pageIndex) return;
    setTurning(true);
    window.setTimeout(() => {
      setPageIndex(next);
      setTurning(false);
    }, 420);
  };

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
          <Button variant="outline" size="sm" onClick={() => setBookOnly((value) => !value)} aria-label={bookOnly ? "Show reading controls" : "Book only mode"}>
            {bookOnly ? <Minimize2 data-icon="inline-start" /> : <Maximize2 data-icon="inline-start" />}
            {bookOnly ? "Exit book view" : "Book only"}
          </Button>
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
      <div className={cn("flex-1 overflow-y-auto", bookOnly && "bg-[#e8e2d8]")}>
        <article className={cn("mx-auto px-6 py-10 transition-all", bookOnly ? "max-w-[1500px] py-14" : "max-w-[1180px]")}>
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
            {currentPair.map((page, i) => (
              <section key={`${pageIndex}-${i}`} className={cn("relative min-h-[60vh] rounded-sm border border-[#d9d0c2] bg-[#fffdf8] p-10 shadow-[0_20px_45px_-20px_rgba(40,24,12,0.55)] transition-transform duration-500 [transform-style:preserve-3d]", turning && (i === 0 ? "-rotate-y-6" : "rotate-y-6"))} style={{ fontFamily: "'Georgia', 'Palatino Linotype', 'Times New Roman', serif", fontSize: bookOnly ? "1.28rem" : "1.1rem", lineHeight: "1.9", color: "oklch(0.2 0.02 60)", wordSpacing: "0.025em" }}>
                <div className="pointer-events-none absolute inset-y-0 left-1/2 w-12 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#7d6242]/10 to-transparent" />
                <div className="relative whitespace-pre-line">{page}</div>
                <div className="absolute inset-x-10 bottom-10 border-t border-border/70 pt-3 text-center text-[0.7rem] tracking-[0.2em] text-muted-foreground">{pageIndex * 2 + i + 1}</div>
              </section>
            ))}
            <Button variant="outline" size="icon" className="absolute -left-8 top-1/2 size-12 -translate-y-1/2 rounded-full bg-background shadow-sm" onClick={() => turnPage(-1)} disabled={pageIndex === 0 || turning} aria-label="Previous spread"><ArrowLeft /></Button>
            <Button variant="outline" size="icon" className="absolute -right-8 top-1/2 size-12 -translate-y-1/2 rounded-full bg-background shadow-sm" onClick={() => turnPage(1)} disabled={pageIndex === pagePairs.length - 1 || turning} aria-label="Next spread"><ArrowRight /></Button>
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
