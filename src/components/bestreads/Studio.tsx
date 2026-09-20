import { useMemo, useRef, useState } from "react";
import { BadgeCheck, Flag, ImagePlus, ScanSearch, Save, Send, Type, Heading1, Heading2, Quote, LayoutTemplate, Users, Check, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { BookCover } from "./BookCover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useBestreads } from "@/lib/bestreads/store";
import { cn } from "@/lib/utils";

const MAX_WORDS = 2000;
const PAGE_HEIGHT = 420;

function CoverCropper({
  open,
  onOpenChange,
  onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApply: (dataUrl: string) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Cover Art Studio</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Every cover is forced into a 2:3 book ratio. Zoom and pan until it sits right.
        </p>
        <div className="mx-auto w-48 overflow-hidden rounded-sm border border-border bg-muted shadow-cover">
          <div className="aspect-2/3 w-full overflow-hidden">
            {src ? (
              <img
                src={src}
                alt="Cover preview"
                className="h-full w-full object-cover"
                style={{
                  objectPosition: `${x}% ${y}%`,
                  transform: `scale(${zoom / 100}) translate(${((50 - x) * (zoom / 100 - 1)) / 2}%, ${((50 - y) * (zoom / 100 - 1)) / 2}%)`,
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No image yet
              </div>
            )}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setSrc(String(reader.result));
            reader.readAsDataURL(file);
          }}
        />
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <ImagePlus className="size-4" /> Choose image
        </Button>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Zoom</Label>
            <Slider value={[zoom]} min={100} max={250} onValueChange={(v) => setZoom(v[0]!)} />
          </div>
          <div>
            <Label className="text-xs">Pan horizontal</Label>
            <Slider value={[x]} max={100} onValueChange={(v) => setX(v[0]!)} />
          </div>
          <div>
            <Label className="text-xs">Pan vertical</Label>
            <Slider value={[y]} max={100} onValueChange={(v) => setY(v[0]!)} />
          </div>
        </div>
        <Button
          disabled={!src}
          onClick={() => {
            if (src) onApply(src);
            onOpenChange(false);
          }}
        >
          Apply cover
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function Studio() {
  const { saveDraft, publishBook, setView, user, revisions, inviteCoAuthor, approveRevision } = useBestreads();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [coverImage, setCoverImage] = useState<string | undefined>(undefined);
  const [bannerImage, setBannerImage] = useState<string>("");
  const [buyLink, setBuyLink] = useState("");
  const [cropperOpen, setCropperOpen] = useState(false);

  // Notion-style features
  const [typography, setTypography] = useState<"serif" | "poetry" | "modern">("serif");
  const [bubbleStyle, setBubbleStyle] = useState<React.CSSProperties>({ display: "none" });
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const words = useMemo(() => body.trim().split(/\s+/).filter(Boolean).length, [body]);
  const pages = Math.max(1, Math.ceil((body.length || 1) / 900));

  const addTag = () => {
    const t = tagInput.trim().replace(/^#*/, "");
    if (!t) return;
    if (tags.length >= 5) {
      toast.error("Maximum of 5 hashtags per text.");
      return;
    }
    setTags((p) => [...p, `#${t.toUpperCase()}`]);
    setTagInput("");
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    if (target.selectionStart !== target.selectionEnd) {
      // Rough position for local demo
      const { selectionStart, value } = target;
      // Just a simple fixed floating bar for the mockup
      setBubbleStyle({ display: "flex", top: "10px", right: "10px" });
    } else {
      setBubbleStyle({ display: "none" });
    }
  };

  const applyFormat = (prefix: string, suffix: string = "") => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    if (start === end) return;
    const selectedText = body.substring(start, end);
    const newBody = body.substring(0, start) + prefix + selectedText + suffix + body.substring(end);
    setBody(newBody);
    setBubbleStyle({ display: "none" });
  };

  const applyTemplate = (template: string) => {
    setBody(template);
    setTemplatesOpen(false);
  };

  const persist = async (publish: boolean) => {
    if (!title.trim()) {
      toast.error("Your text needs a title.");
      return;
    }
    const payload = { 
      title, 
      summary, 
      hashtags: tags, 
      body, 
      cover: 2, 
      coverImage, 
      bannerImage: bannerImage.trim() || undefined,
      buyLink: buyLink.trim() || undefined 
    };
    const res = publish ? await publishBook(payload) : saveDraft(payload);
    if (!res.ok) {
      toast.error(res.error ?? "Could not save");
      return;
    }
    toast.success(publish ? "Published — live on Bestreads" : "Draft saved");
    setView("bookshelf");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-32">
      <header className="py-8">
        <h1 className="font-display text-4xl font-semibold">Writer Studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Distraction-free. The page breaks you see are the page breaks readers get.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_15rem]">
        <div className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="font-display h-14 border-0 border-b border-border bg-transparent px-0 text-3xl! shadow-none focus-visible:ring-0"
          />
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="One-paragraph summary for the feed…"
            className="min-h-20 resize-none bg-card"
          />
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setTags((p) => p.filter((x) => x !== t))}
                className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
              >
                {t} ×
              </button>
            ))}
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="#hashtag"
              className="h-8 w-32 bg-card text-xs"
            />
            <span className="text-xs text-muted-foreground">{tags.length}/5</span>
          </div>

          <div className="relative rounded-sm border border-border bg-parchment shadow-soft overflow-hidden transition-all duration-300">
            {bannerImage && (
              <div className="h-48 w-full border-b border-border">
                <img src={bannerImage} alt="Banner" className="h-full w-full object-cover" />
              </div>
            )}
            <div
              className="paper-edge pointer-events-none absolute inset-0"
              style={{ ["--page-height" as string]: `${PAGE_HEIGHT}px` }}
            />

            {/* Bubble Toolbar */}
            <div 
              className="absolute z-20 gap-1 rounded-md border border-border bg-card p-1 shadow-lg backdrop-blur-md"
              style={bubbleStyle}
            >
              <div className="flex items-center gap-1 border-r border-border pr-2">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setTypography("serif")} title="Serif Novel"><Type className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setTypography("poetry")} title="Sinuous Poetry"><Type className="h-3 w-3 opacity-70" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setTypography("modern")} title="Modernist Essay"><Type className="h-3 w-3 font-sans" /></Button>
              </div>
              <div className="flex items-center gap-1 pl-1">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => applyFormat("# ")} title="H1"><Heading1 className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => applyFormat("## ")} title="H2"><Heading2 className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => applyFormat("> ")} title="Blockquote"><Quote className="h-3 w-3" /></Button>
              </div>
            </div>

            <Textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onSelect={handleSelect}
              placeholder="Begin. The first sentence is the only one that has to be brave…"
              className={cn(
                "relative min-h-[840px] resize-none border-0 bg-transparent p-10 text-lg leading-8 shadow-none focus-visible:ring-0",
                typography === "serif" ? "font-serif" : typography === "poetry" ? "font-serif italic tracking-wide" : "font-sans font-light"
              )}
            />
            <div className="pointer-events-none absolute right-3 bottom-2 text-[0.65rem] tracking-widest text-muted-foreground uppercase">
              {pages} page{pages > 1 ? "s" : ""} · A4 simulation
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <BookCover title={title || "Untitled"} author={user?.name} cover={2} image={coverImage} />
          <Button variant="outline" className="w-full" onClick={() => setCropperOpen(true)}>
            <ImagePlus className="size-4" /> Upload Cover Art
          </Button>

          <div className="space-y-1.5 pt-2">
            <Label className="text-xs">Banner Image URL</Label>
            <Input
              value={bannerImage}
              onChange={(e) => setBannerImage(e.target.value)}
              placeholder="https://..."
              className="text-xs"
            />
          </div>

          <Button variant="secondary" className="w-full flex items-center justify-center gap-2" onClick={() => setTemplatesOpen(true)}>
            <LayoutTemplate className="size-4" /> Formatting Templates
          </Button>

          {/* Co-Authors & Helpers Sidebar */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
              <Users className="size-4" /> Co-Authors & Helpers
            </h3>
            <p className="text-xs text-muted-foreground">
              {user?.tier === "free" ? "Free tier allows 1 co-author. Upgrade for 4." : "Pro tier allows up to 4 co-authors."}
            </p>
            <div className="flex gap-2">
              <Input
                value={inviteInput}
                onChange={(e) => setInviteInput(e.target.value)}
                placeholder="@username"
                className="text-xs h-8"
              />
              <Button size="sm" variant="default" className="h-8 shrink-0" onClick={() => {
                void inviteCoAuthor(inviteInput).then(res => {
                  if (res.ok) {
                    toast.success("Invitation sent.");
                    setInviteInput("");
                  } else {
                    toast.error(res.error);
                  }
                });
              }}>
                <UserPlus className="size-3" />
              </Button>
            </div>
            
            {revisions.length > 0 && (
              <div className="mt-4 rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2">
                  <Check className="size-3 inline mr-1" /> Approve Changes from Helper
                </p>
                <p className="text-xs text-muted-foreground mb-3">You have {revisions.length} pending revision(s).</p>
                {revisions.map(rev => (
                  <Button key={rev.id} size="sm" className="w-full text-xs" onClick={() => void approveRevision(rev.id)}>
                    Approve Revision
                  </Button>
                ))}
              </div>
            )}
          </div>

          {user?.isPro && (
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs">Buy Book Link (Pro)</Label>
              <Input
                value={buyLink}
                onChange={(e) => setBuyLink(e.target.value)}
                placeholder="https://gumroad.com/..."
                className="text-xs"
              />
            </div>
          )}

          <Button className="w-full" onClick={() => void persist(true)}>
            <Send className="size-4" /> Publish
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => void persist(false)}>
            <Save className="size-4" /> Save draft
          </Button>
          <p className="rounded-md border border-border bg-card p-3 text-xs font-semibold">
            No DMs on Bestreads – just reading.
          </p>
        </aside>
      </div>

      <CoverCropper open={cropperOpen} onOpenChange={setCropperOpen} onApply={setCoverImage} />

      <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Formatting Templates</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Button variant="outline" className="h-16 justify-start px-4 text-left font-serif text-sm" onClick={() => applyTemplate("# Novel Outline\n\n## Chapter 1\n\n[Content here]\n\n## Chapter 2\n\n[Content here]")}>
              Novel Outline
            </Button>
            <Button variant="outline" className="h-16 justify-start px-4 text-left font-serif italic text-sm" onClick={() => applyTemplate("# Poetry Grid\n\n> Verse 1\n> Line 2\n> Line 3\n\n> Verse 2\n> Line 2\n> Line 3")}>
              Poetry Grid
            </Button>
            <Button variant="outline" className="h-16 justify-start px-4 text-left font-sans text-sm" onClick={() => applyTemplate("# Essay Title\n\n## Introduction\n\n[Content]\n\n## Thesis\n\n[Content]")}>
              Modernist Essay
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3 text-xs">
          <span className="text-metric font-semibold">
            {words}/{MAX_WORDS} words
          </span>
          <span className="inline-flex items-center gap-1.5 text-metric">
            <ScanSearch className="size-3.5" /> Originality Scanner:{" "}
            <strong className="text-verified">100%</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-verified px-2.5 py-1 font-semibold text-verified-foreground">
            <BadgeCheck className="size-3.5" /> Verified Human Account
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() =>
              toast.success("Routed to the human moderation board", {
                description: "A person — not a model — will read this within 24h.",
              })
            }
          >
            <Flag className="size-3.5" /> Report Plagiarism / AI
          </Button>
        </div>
      </div>
    </div>
  );
}
