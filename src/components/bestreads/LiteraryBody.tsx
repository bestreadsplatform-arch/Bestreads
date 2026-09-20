import type { BlockKind, DocBlock, LiteraryLayout } from "@/lib/bestreads/document";
import { cn } from "@/lib/utils";

export function layoutSurfaceClass(layout: LiteraryLayout) {
  if (layout === "poetry") {
    return "font-serif italic tracking-[0.04em] leading-[2.15] text-center max-w-[34rem] mx-auto";
  }
  if (layout === "modern") {
    return "font-sans font-light tracking-[-0.01em] leading-[1.75] max-w-[40rem]";
  }
  return "font-serif leading-[1.95] tracking-[0.01em] max-w-[38rem] [text-wrap:pretty]";
}

export function blockClass(kind: BlockKind, layout: LiteraryLayout) {
  if (kind === "heading1") {
    return cn(
      "outline-none",
      layout === "modern"
        ? "font-sans text-3xl font-semibold tracking-tight not-italic"
        : "font-display text-3xl font-semibold not-italic tracking-tight",
    );
  }
  if (kind === "heading2") {
    return cn(
      "outline-none",
      layout === "modern"
        ? "font-sans text-xl font-medium tracking-tight not-italic"
        : "font-display text-xl font-semibold not-italic",
    );
  }
  if (kind === "quote") {
    return "outline-none border-l-2 border-gold pl-5 italic font-serif text-[1.05em] text-muted-foreground";
  }
  if (kind === "verse" || layout === "poetry") {
    return "outline-none whitespace-pre-wrap italic";
  }
  return cn("outline-none whitespace-pre-wrap", layout === "serif" && "indent-[1.5em] first:indent-0");
}

export function LiteraryBody({
  blocks,
  layout,
  className,
}: {
  blocks: DocBlock[];
  layout: LiteraryLayout;
  className?: string;
}) {
  const visible = blocks.filter((b) => b.text.trim().length > 0);
  return (
    <div className={cn("space-y-6", layoutSurfaceClass(layout), className)}>
      {visible.length === 0 ? (
        <p className="italic text-muted-foreground">No content available for this text.</p>
      ) : (
        visible.map((block) => {
          const Tag = block.kind === "heading1" ? "h2" : block.kind === "heading2" ? "h3" : block.kind === "quote" ? "blockquote" : "p";
          return (
            <Tag key={block.id} className={blockClass(block.kind, layout)}>
              {block.text}
            </Tag>
          );
        })
      )}
    </div>
  );
}
