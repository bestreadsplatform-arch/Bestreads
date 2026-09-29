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
  const pagePairs = useMemo(() => {
    const source = book ? (book.content || book.excerpt || "").trim() : "";
    const pageSize = 900;
    const pages: string[] = [];
    let rest = source;
    while (rest.length > pageSize) {
      let cut = rest.lastIndexOf(" ", pageSize);
      const paragraphCut = rest.lastIndexOf("\n\n", pageSize);
      if (paragraphCut > pageSize * 0.55) cut = paragraphCut;
      if (cut < pageSize * 0.55) cut = pageSize;
      pages.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest || pages.length === 0) pages.push(rest || "No content available for this text.");
    if (pages.length % 2) pages.push("");
    const pairs: string[][] = [];
    for (let i = 0; i < pages.length; i += 2) pairs.push(pages.slice(i, i + 2));
    return pairs;
  }, [book]);
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
        className={cn(
          "flex shrink-0 items-center justify-between px-6 py-3 transition-opacity",
          bookOnly && "pointer-events-none absolute inset-x-0 top-0 z-10 opacity-0 hover:pointer-events-auto hover:opacity-100",
        )}
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
      <div className={cn("flex-1 overflow-hidden", bookOnly ? "bg-[#3f4653]" : "bg-[#f4f0e8]")}>
        <article className={cn("mx-auto px-6", bookOnly ? "max-w-[1480px] py-8" : "max-w-[1320px] py-8")}>
          {/* Title block */}
          <header className={cn("mb-8 pb-6", bookOnly && "hidden")} style={{ borderBottom: "1px solid oklch(0.88 0.02 85)" }}>
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

          <div className={cn("relative mx-auto w-full px-8", bookOnly ? "max-w-[1400px]" : "max-w-[1240px]")} style={{ perspective: "1800px" }}>
            <div className="relative grid h-[min(760px,calc(100vh-170px))] min-h-[620px] grid-cols-2 overflow-hidden rounded-[0.35rem] border border-[#d9d0c2] bg-[#fffdf8] shadow-[0_28px_60px_-22px_rgba(40,24,12,0.62)] [transform-style:preserve-3d]">
              {currentPair.map((page, i) => (
                <section key={`${pageIndex}-${i}`} className={cn("relative h-full min-h-0 overflow-hidden px-16 py-14 pb-24 transition-transform duration-500 [transform-style:preserve-3d]", i === 0 ? "border-r border-[#d9d0c2]" : "", turning && (i === 0 ? "-rotate-y-6" : "rotate-y-6"))} style={{ fontFamily: "'Georgia', 'Palatino Linotype', 'Times New Roman', serif", fontSize: bookOnly ? "1.4rem" : "1.22rem", lineHeight: "1.85", color: "oklch(0.2 0.02 60)", wordSpacing: "0.025em", background: i === 0 ? "linear-gradient(100deg, #fffdf8 0%, #fffdf8 92%, #eee5d8 100%)" : "linear-gradient(260deg, #fffdf8 0%, #fffdf8 92%, #eee5d8 100%)" }}>
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-[#7d6242]/10 to-transparent" />
                  <div className="relative whitespace-pre-line">{page}</div>
                  <div className="absolute inset-x-16 bottom-12 border-t border-[#d9d0c2] pt-4 text-center text-[0.75rem] tracking-[0.2em] text-muted-foreground">{pageIndex * 2 + i + 1}</div>
                </section>
              ))}
              <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#6d5438]/15 to-transparent" />
            </div>
            <Button variant="outline" size="icon" className="absolute -left-1 top-1/2 size-12 -translate-y-1/2 rounded-full bg-background shadow-sm" onClick={() => turnPage(-1)} disabled={pageIndex === 0 || turning} aria-label="Previous spread"><ArrowLeft /></Button>
            <Button variant="outline" size="icon" className="absolute -right-1 top-1/2 size-12 -translate-y-1/2 rounded-full bg-background shadow-sm" onClick={() => turnPage(1)} disabled={pageIndex === pagePairs.length - 1 || turning} aria-label="Next spread"><ArrowRight /></Button>
          </div>
          <div className="mt-5 flex items-center justify-center gap-3 text-xs text-muted-foreground"><span>Spread {pageIndex + 1} of {pagePairs.length}</span><span aria-hidden="true">·</span><span>Use the arrows to turn the page</span></div>

          {/* Footer */}
          <footer
            className={cn("mt-8 pt-6 text-center text-xs text-muted-foreground", bookOnly && "hidden")}
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
