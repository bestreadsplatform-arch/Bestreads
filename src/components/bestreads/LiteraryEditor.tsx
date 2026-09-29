import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Code2, Eraser, ImagePlus, Italic, Link2, List, ListOrdered, Redo2, Strikethrough, Underline, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createBlock,
  type BlockKind,
  type DocBlock,
  type EditorSelection,
  type LiteraryDoc,
  type LiteraryLayout,
} from "@/lib/bestreads/document";
import { blockClass, layoutSurfaceClass } from "./LiteraryBody";
import { cn } from "@/lib/utils";

function closestBlockEl(node: Node | null, root: HTMLElement): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== root) {
    if (current instanceof HTMLElement && current.dataset.blockId) return current;
    current = current.parentNode;
  }
  return null;
}

function caretOffsetInBlock(container: Node, offset: number, blockEl: HTMLElement): number {
  const range = document.createRange();
  range.selectNodeContents(blockEl);
  range.setEnd(container, offset);
  return range.toString().length;
}

function readSelection(root: HTMLElement, blocks: DocBlock[]): EditorSelection | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  const startEl = closestBlockEl(range.startContainer, root);
  const endEl = closestBlockEl(range.endContainer, root);
  if (!startEl || !endEl) return null;
  const startId = startEl.dataset.blockId;
  const endId = endEl.dataset.blockId;
  const startIndex = blocks.findIndex((b) => b.id === startId);
  const endIndex = blocks.findIndex((b) => b.id === endId);
  if (startIndex < 0 || endIndex < 0) return null;
  return {
    startIndex,
    startOffset: caretOffsetInBlock(range.startContainer, range.startOffset, startEl),
    endIndex,
    endOffset: caretOffsetInBlock(range.endContainer, range.endOffset, endEl),
  };
}

function placeCaret(blockEl: HTMLElement, offset: number) {
  const text = blockEl.firstChild ?? blockEl;
  const max = (text.textContent ?? "").length;
  const clamped = Math.max(0, Math.min(offset, max));
  const range = document.createRange();
  if (text.nodeType === Node.TEXT_NODE) {
    range.setStart(text, clamped);
  } else {
    range.selectNodeContents(blockEl);
    range.collapse(clamped === 0);
  }
  range.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export function LiteraryEditor({
  doc,
  hydrateKey,
  onChange,
  placeholder,
}: {
  doc: LiteraryDoc;
  hydrateKey: string;
  onChange: (next: LiteraryDoc) => void;
  placeholder?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const docRef = useRef(doc);
  docRef.current = doc;
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right" | "justify">("left");
  const [fontFamily, setFontFamily] = useState("Georgia");
  const [fontSize, setFontSize] = useState("3");
  const [lineHeight, setLineHeight] = useState("1.7");

  const syncDomFromDoc = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    for (const block of docRef.current.blocks) {
      const el = root.querySelector<HTMLElement>(`[data-block-id="${block.id}"]`);
      if (el && el.innerText !== block.text) el.innerText = block.text || "";
    }
  }, []);

  useLayoutEffect(() => {
    syncDomFromDoc();
  }, [hydrateKey, doc.blocks.length, syncDomFromDoc]);

  const commitBlocks = useCallback(
    (blocks: DocBlock[], layout?: LiteraryLayout) => {
      onChange({ layout: layout ?? docRef.current.layout, blocks });
    },
    [onChange],
  );

  const readBlockText = (id: string) => {
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-block-id="${id}"]`);
    return el?.innerText.replace(/\u00a0/g, " ") ?? "";
  };

  const handleInput = (id: string) => {
    const blocks = docRef.current.blocks.map((b) => (b.id === id ? { ...b, text: readBlockText(id) } : b));
    commitBlocks(blocks);
  };

  const runCommand = (command: string, value?: string) => {
    rootRef.current?.focus();
    document.execCommand(command, false, value);
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.dataset.blockId) handleInput(active.dataset.blockId);
  };

  const setSelectionAlignment = (alignment: "left" | "center" | "right" | "justify") => {
    setTextAlign(alignment);
    runCommand(`justify${alignment[0].toUpperCase()}${alignment.slice(1)}`);
  };

  const addLink = () => {
    const url = window.prompt("Paste a link URL");
    if (url?.trim()) runCommand("createLink", url.trim());
  };

  const addImageBlock = () => {
    const url = window.prompt("Paste an image URL");
    if (!url?.trim()) return;
    const next = [...docRef.current.blocks, { ...createBlock("image", ""), imageUrl: url.trim(), imageAlt: "Editorial image" }];
    commitBlocks(next as DocBlock[]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    const blocks = docRef.current.blocks;
    const block = blocks[index];
    if (!block) return;
    const root = rootRef.current;
    if (!root) return;
    const el = e.currentTarget;
    const sel = readSelection(root, blocks);
    const offset = sel && sel.startIndex === index ? sel.startOffset : (el.innerText.length ?? 0);

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = readBlockText(block.id);
      const left = text.slice(0, offset);
      const right = text.slice(offset);
      const nextKind: BlockKind = block.kind === "verse" ? "verse" : "paragraph";
      const created = createBlock(nextKind, right);
      const next = [
        ...blocks.slice(0, index),
        { ...block, text: left },
        created,
        ...blocks.slice(index + 1),
      ];
      commitBlocks(next);
      requestAnimationFrame(() => {
        const node = rootRef.current?.querySelector<HTMLElement>(`[data-block-id="${created.id}"]`);
        if (node) {
          node.innerText = right;
          node.focus();
          placeCaret(node, 0);
        }
      });
      return;
    }

    if (e.key === "Backspace") {
      const text = readBlockText(block.id);
      if (offset === 0 && index > 0) {
        e.preventDefault();
        const prev = blocks[index - 1]!;
        const merged = prev.text + text;
        const caret = prev.text.length;
        const next = [...blocks.slice(0, index - 1), { ...prev, text: merged }, ...blocks.slice(index + 1)];
        commitBlocks(next);
        requestAnimationFrame(() => {
          const node = rootRef.current?.querySelector<HTMLElement>(`[data-block-id="${prev.id}"]`);
          if (node) {
            node.innerText = merged;
            node.focus();
            placeCaret(node, caret);
          }
        });
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text/plain").replace(/\r\n/g, "\n");
    if (!pasted) return;
    const root = rootRef.current;
    if (!root) return;
    const blocks = docRef.current.blocks;
    const block = blocks[index]!;
    const sel = readSelection(root, blocks);
    const start = sel && sel.startIndex === index ? Math.min(sel.startOffset, sel.endOffset) : readBlockText(block.id).length;
    const end = sel && sel.startIndex === index ? Math.max(sel.startOffset, sel.endOffset) : start;
    const current = readBlockText(block.id);
    const lines = pasted.split("\n");
    if (lines.length === 1) {
      const text = current.slice(0, start) + pasted + current.slice(end);
      const next = blocks.map((b) => (b.id === block.id ? { ...b, text } : b));
      commitBlocks(next);
      requestAnimationFrame(() => {
        const node = rootRef.current?.querySelector<HTMLElement>(`[data-block-id="${block.id}"]`);
        if (node) {
          node.innerText = text;
          placeCaret(node, start + pasted.length);
        }
      });
      return;
    }
    const first = current.slice(0, start) + (lines[0] ?? "");
    const last = (lines[lines.length - 1] ?? "") + current.slice(end);
    const middle = lines.slice(1, -1).map((line) => createBlock(block.kind === "verse" ? "verse" : "paragraph", line));
    const lastBlock = createBlock(block.kind === "verse" ? "verse" : "paragraph", last);
    const next = [
      ...blocks.slice(0, index),
      { ...block, text: first },
      ...middle,
      lastBlock,
      ...blocks.slice(index + 1),
    ];
    commitBlocks(next);
    requestAnimationFrame(() => {
      const node = rootRef.current?.querySelector<HTMLElement>(`[data-block-id="${lastBlock.id}"]`);
      if (node) {
        node.innerText = last;
        node.focus();
        placeCaret(node, (lines[lines.length - 1] ?? "").length);
      }
    });
  };

  return (
    <div className="relative min-h-[840px] p-10">
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
        <span className="font-medium text-foreground">Page view</span>
        <span>A4 · 900-character guide</span>
        <div className="flex flex-wrap items-center gap-1 border-l border-border pl-2">
          <select aria-label="Font family" value={fontFamily} onChange={(e) => { setFontFamily(e.target.value); runCommand("fontName", e.target.value); }} className="h-7 rounded border border-border bg-background px-2 text-xs text-foreground"><option>Georgia</option><option>Times New Roman</option><option>Arial</option><option>Helvetica</option><option>Courier New</option><option>Verdana</option></select>
          <select aria-label="Text size" value={fontSize} onChange={(e) => { setFontSize(e.target.value); runCommand("fontSize", e.target.value); }} className="h-7 w-16 rounded border border-border bg-background px-2 text-xs text-foreground"><option value="1">10</option><option value="2">12</option><option value="3">14</option><option value="4">18</option><option value="5">24</option><option value="6">32</option><option value="7">48</option></select>
          <Button size="icon" variant="ghost" className="size-7" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("bold")} aria-label="Bold"><Bold /></Button>
          <Button size="icon" variant="ghost" className="size-7" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("italic")} aria-label="Italic"><Italic /></Button>
          <Button size="icon" variant="ghost" className="size-7" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("underline")} aria-label="Underline"><Underline /></Button>
          <Button size="icon" variant="ghost" className="size-7" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("strikeThrough")} aria-label="Strikethrough"><Strikethrough /></Button>
          <Button size="icon" variant="ghost" className="size-7" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("removeFormat")} aria-label="Clear formatting"><Eraser /></Button>
          <Button size="icon" variant="ghost" className="size-7" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("insertUnorderedList")} aria-label="Bulleted list"><List /></Button>
          <Button size="icon" variant="ghost" className="size-7" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("insertOrderedList")} aria-label="Numbered list"><ListOrdered /></Button>
          <Button size="icon" variant="ghost" className="size-7" onMouseDown={(e) => e.preventDefault()} onClick={addLink} aria-label="Add link"><Link2 /></Button>
          <Button size="icon" variant="ghost" className="size-7" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("undo")} aria-label="Undo"><Undo2 /></Button>
          <Button size="icon" variant="ghost" className="size-7" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("redo")} aria-label="Redo"><Redo2 /></Button>
          <Button size="icon" variant="ghost" className="size-7" onMouseDown={(e) => e.preventDefault()} onClick={() => runCommand("formatBlock", "<pre>")} aria-label="Code block"><Code2 /></Button>
        </div>
        <div className="ml-auto flex items-center gap-1 border-l border-border pl-2">
          <Button size="icon" variant={textAlign === "left" ? "secondary" : "ghost"} className="size-7" onMouseDown={(e) => e.preventDefault()} onClick={() => setSelectionAlignment("left")} aria-label="Align left"><AlignLeft /></Button>
          <Button size="icon" variant={textAlign === "center" ? "secondary" : "ghost"} className="size-7" onMouseDown={(e) => e.preventDefault()} onClick={() => setSelectionAlignment("center")} aria-label="Align center"><AlignCenter /></Button>
          <Button size="icon" variant={textAlign === "right" ? "secondary" : "ghost"} className="size-7" onMouseDown={(e) => e.preventDefault()} onClick={() => setSelectionAlignment("right")} aria-label="Align right"><AlignRight /></Button>
          <Button size="icon" variant={textAlign === "justify" ? "secondary" : "ghost"} className="size-7" onMouseDown={(e) => e.preventDefault()} onClick={() => setSelectionAlignment("justify")} aria-label="Justify"><AlignJustify /></Button>
          <select aria-label="Line spacing" value={lineHeight} onChange={(e) => { setLineHeight(e.target.value); if (rootRef.current) rootRef.current.style.lineHeight = e.target.value; }} className="h-7 rounded border border-border bg-background px-2 text-xs text-foreground"><option value="1.15">1.15</option><option value="1.5">1.5</option><option value="1.7">1.7</option><option value="2">2.0</option><option value="2.5">2.5</option></select>
        </div>
      </div>
      <div
        ref={rootRef}
        style={{ textAlign }}
        className={cn("relative min-h-[900px] space-y-4 border-x-2 border-dashed border-primary/30 bg-background px-10 py-8 text-lg shadow-inner [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_899px,hsl(var(--primary)/0.28)_899px,hsl(var(--primary)/0.28)_901px)]", layoutSurfaceClass(doc.layout))}
      >
        {doc.blocks.map((block, index) => block.kind === "image" ? (
          <figure key={block.id} data-block-id={block.id} className="my-8 break-inside-avoid rounded-lg border border-border bg-card p-3 text-left shadow-sm">
            {block.imageUrl ? <img src={block.imageUrl} alt={block.imageAlt || "Editorial image"} className="max-h-[620px] w-full rounded object-contain" /> : <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground">Image block</div>}
            <figcaption className="mt-2 text-center text-xs text-muted-foreground">Editorial image · counts toward this page</figcaption>
          </figure>
        ) : (
          <div
            key={block.id}
            data-block-id={block.id}
            data-kind={block.kind}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-placeholder={index === 0 ? placeholder : undefined}
            className={cn(
              "min-h-[1.75em] empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]",
              blockClass(block.kind, doc.layout),
            )}
            data-placeholder={index === 0 ? placeholder : ""}
            onInput={() => handleInput(block.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={(e) => handlePaste(e, index)}
          />
        ))}
      </div>
    </div>
  );
}
