export type LiteraryLayout = "serif" | "poetry" | "modern";
export type BlockKind = "paragraph" | "heading1" | "heading2" | "quote" | "verse";

export type DocBlock = {
  id: string;
  kind: BlockKind;
  text: string;
};

export type LiteraryDoc = {
  layout: LiteraryLayout;
  blocks: DocBlock[];
};

export type EditorSelection = {
  startIndex: number;
  startOffset: number;
  endIndex: number;
  endOffset: number;
};

export type PanSettings = {
  bannerImage?: string;
  layout?: LiteraryLayout;
  blocks?: DocBlock[];
};

export function createBlock(kind: BlockKind = "paragraph", text = ""): DocBlock {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `b${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, kind, text };
}

export function emptyDoc(layout: LiteraryLayout = "serif"): LiteraryDoc {
  return { layout, blocks: [createBlock("paragraph", "")] };
}

/** Strip markdown tokens so published pages never leak editor chrome. */
export function stripMarkdownLeaks(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-zA-Z0-9_-]*\n?/, "").replace(/```$/, ""))
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "");
}

export function blocksFromPlain(text: string): DocBlock[] {
  const cleaned = stripMarkdownLeaks(text);
  const chunks = cleaned.split(/\n{2,}/);
  const blocks = chunks.map((chunk) => createBlock("paragraph", chunk.replace(/\n/g, " ").trim()));
  return blocks.length > 0 ? blocks : [createBlock("paragraph", "")];
}

export function hydrateDoc(content: string, pan?: PanSettings | null): LiteraryDoc {
  const layout = pan?.layout === "poetry" || pan?.layout === "modern" ? pan.layout : "serif";
  if (pan?.blocks && pan.blocks.length > 0) {
    return {
      layout,
      blocks: pan.blocks.map((b) => ({
        id: b.id || createBlock().id,
        kind: isBlockKind(b.kind) ? b.kind : "paragraph",
        text: stripMarkdownLeaks(b.text ?? ""),
      })),
    };
  }
  return { layout, blocks: blocksFromPlain(content ?? "") };
}

export function serializeLiterary(doc: LiteraryDoc): string {
  return doc.blocks
    .map((b) => stripMarkdownLeaks(b.text).trimEnd())
    .join("\n\n")
    .replace(/^\n+|\n+$/g, "");
}

export function wordCount(doc: LiteraryDoc): number {
  return serializeLiterary(doc).trim().split(/\s+/).filter(Boolean).length;
}

export function isBlockKind(value: string): value is BlockKind {
  return value === "paragraph" || value === "heading1" || value === "heading2" || value === "quote" || value === "verse";
}

export function normalizeSelection(sel: EditorSelection, blockCount: number): EditorSelection | null {
  if (blockCount <= 0) return null;
  let { startIndex, startOffset, endIndex, endOffset } = sel;
  if (startIndex > endIndex || (startIndex === endIndex && startOffset > endOffset)) {
    [startIndex, startOffset, endIndex, endOffset] = [endIndex, endOffset, startIndex, startOffset];
  }
  if (startIndex < 0 || endIndex >= blockCount) return null;
  if (startIndex === endIndex && startOffset === endOffset) return null;
  return { startIndex, startOffset, endIndex, endOffset };
}

/**
 * Change block kind only for blocks that intersect the live selection.
 * Unselected blocks keep both kind and text; selected text is never rewritten.
 */
export function applyKindToSelection(
  blocks: DocBlock[],
  sel: EditorSelection | null,
  kind: BlockKind,
): DocBlock[] {
  if (!sel) return blocks;
  const n = normalizeSelection(sel, blocks.length);
  if (!n) return blocks;
  return blocks.map((block, i) => {
    if (i < n.startIndex || i > n.endIndex) return block;
    return { ...block, kind };
  });
}

export function applyLayout(doc: LiteraryDoc, layout: LiteraryLayout): LiteraryDoc {
  return { ...doc, layout };
}

export const LITERARY_TEMPLATES: Record<string, LiteraryDoc> = {
  novel: {
    layout: "serif",
    blocks: [
      createBlock("heading1", "Chapter One"),
      createBlock("paragraph", "Begin in the room where the decision is made. Keep the furniture ordinary; let the weather do the work."),
      createBlock("heading2", "Later that evening"),
      createBlock("paragraph", "A second movement. Someone arrives who should not have come, or someone stays who should have left."),
    ],
  },
  poetry: {
    layout: "poetry",
    blocks: [
      createBlock("verse", "The first line is a held breath."),
      createBlock("verse", "The second line lets it go."),
      createBlock("verse", ""),
      createBlock("verse", "White space is also a line."),
    ],
  },
  essay: {
    layout: "modern",
    blocks: [
      createBlock("heading1", "Thesis"),
      createBlock("paragraph", "State the claim in one clean sentence. Then refuse to decorate it."),
      createBlock("heading2", "Evidence"),
      createBlock("quote", "Place the borrowed voice here, then return to your own."),
      createBlock("paragraph", "Close by naming what the claim cannot yet hold."),
    ],
  },
};

export function parsePanSettings(raw: unknown): PanSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const layout = rec.layout === "poetry" || rec.layout === "modern" || rec.layout === "serif" ? rec.layout : undefined;
  const bannerImage = typeof rec.bannerImage === "string" ? rec.bannerImage : undefined;
  const blocks = Array.isArray(rec.blocks)
    ? rec.blocks
        .filter((b): b is Record<string, unknown> => !!b && typeof b === "object")
        .map((b) => ({
          id: typeof b.id === "string" ? b.id : createBlock().id,
          kind: isBlockKind(String(b.kind ?? "paragraph")) ? (b.kind as BlockKind) : "paragraph",
          text: typeof b.text === "string" ? b.text : "",
        }))
    : undefined;
  return { layout, bannerImage, blocks };
}
