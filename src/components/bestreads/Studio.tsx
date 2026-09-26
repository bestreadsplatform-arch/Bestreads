import { useMemo, useState } from "react";
import { LayoutTemplate, Save, Send, Users, UserPlus, ImagePlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBestreads } from "@/lib/bestreads/store";
import { LITERARY_TEMPLATES, serializeLiterary, type LiteraryDoc } from "@/lib/bestreads/document";
import { LiteraryEditor } from "./LiteraryEditor";

const MAX_WORDS = 2000;

export function Studio() {
  const { workspace, patchWorkspace, saveDraft, publishBook, setView, user, inviteCoAuthor } = useBestreads();
  const draft = workspace.draft;
  const [tagInput, setTagInput] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [inviteInput, setInviteInput] = useState("");

  const doc: LiteraryDoc = { layout: draft.layout, blocks: draft.blocks };
  const body = serializeLiterary(doc);
  const words = useMemo(() => body.trim().split(/\s+/).filter(Boolean).length, [body]);
  const pages = Math.max(1, Math.ceil((body.length || 1) / 900));

  const addTag = () => {
    const value = tagInput.trim().replace(/^#*/, "").toUpperCase();
    if (!value) return;
    if (draft.hashtags.length >= 5) return toast.error("Maximum of 5 hashtags per text.");
    patchWorkspace({ hashtags: [...draft.hashtags, `#${value}`] });
    setTagInput("");
  };

  const persist = async (publish: boolean) => {
    if (!draft.title.trim()) return toast.error("Your text needs a title.");
    const payload = { ...draft, body, blocks: draft.blocks, layout: draft.layout };
    const result = publish ? await publishBook(payload) : await saveDraft(payload);
    if (!result.ok) return toast.error(result.error ?? "Could not save");
    toast.success(publish ? "Published — live on Bestreads" : "Draft saved");
    setView("bookshelf");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28">
      <header className="py-8">
        <h1 className="font-display text-4xl font-semibold">Writer Studio</h1>
        <p className="mt-1 text-sm text-muted-foreground">A quiet, block-based workspace for sentences worth keeping.</p>
      </header>
      <div className="grid gap-6 md:grid-cols-[1fr_15rem]">
        <main className="flex min-w-0 flex-col gap-4">
          <Input value={draft.title} onChange={(e) => patchWorkspace({ title: e.target.value })} placeholder="Title" className="h-14 border-0 border-b border-border bg-transparent px-0 font-display text-3xl! shadow-none focus-visible:ring-0" />
          <Textarea value={draft.summary} onChange={(e) => patchWorkspace({ summary: e.target.value })} placeholder="One-paragraph summary for the feed…" className="min-h-20 resize-none bg-card" />
          <div className="flex flex-wrap items-center gap-2">
            {draft.hashtags.map((tag) => <button type="button" key={tag} onClick={() => patchWorkspace({ hashtags: draft.hashtags.filter((x) => x !== tag) })} className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">{tag} ×</button>)}
            <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="#hashtag" className="h-8 w-32 bg-card text-xs" />
            <span className="text-xs text-muted-foreground">{draft.hashtags.length}/5</span>
          </div>
          <section className="overflow-hidden rounded-sm border border-border bg-parchment shadow-soft">
            {draft.bannerImage && <img src={draft.bannerImage} alt="Publication banner" className="h-48 w-full border-b border-border object-cover" />}
            <LiteraryEditor doc={doc} hydrateKey={`${workspace.nonce}:${draft.id}`} onChange={(next) => patchWorkspace({ blocks: next.blocks, layout: next.layout, body: serializeLiterary(next) })} placeholder="Begin. The first sentence is the only one that has to be brave…" />
            <div className="px-4 pb-3 text-right text-[0.65rem] tracking-widest text-muted-foreground uppercase">{pages} page{pages > 1 ? "s" : ""} · A4 simulation</div>
          </section>
        </main>
        <aside className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2"><ImagePlus className="size-4" /><Label htmlFor="banner" className="text-xs">Banner image URL</Label></div>
            <Input id="banner" value={draft.bannerImage ?? ""} onChange={(e) => patchWorkspace({ bannerImage: e.target.value || undefined })} placeholder="https://…" className="text-xs" />
          </div>
          <Button variant="secondary" className="w-full" onClick={() => setTemplatesOpen(true)}><LayoutTemplate className="size-4" /> Formatting templates</Button>
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-semibold"><Users className="size-4" /> Co-authors & helpers</h3>
            <p className="mb-3 text-xs text-muted-foreground">Invites stay in the recipient&apos;s Inbox until accepted.</p>
            <div className="flex gap-2"><Input value={inviteInput} onChange={(e) => setInviteInput(e.target.value)} placeholder="@username" className="h-8 text-xs" /><Button size="sm" className="h-8" onClick={() => void inviteCoAuthor(inviteInput, draft.id).then((r) => r.ok ? (setInviteInput(""), toast.success("Invitation sent.")) : toast.error(r.error))}><UserPlus className="size-3" /></Button></div>
          </div>
          <Button className="w-full" onClick={() => void persist(true)}><Send className="size-4" /> Publish</Button>
          <Button variant="secondary" className="w-full" onClick={() => void persist(false)}><Save className="size-4" /> Save draft</Button>
        </aside>
      </div>
      <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}><DialogContent><DialogHeader><DialogTitle className="font-display">Formatting templates</DialogTitle></DialogHeader><div className="grid gap-3">{([['novel','Novel outline'],['poetry','Poetry grid'],['essay','Modernist essay']] as const).map(([key, label]) => <Button key={key} variant="outline" className="h-14 justify-start" onClick={() => { const template = LITERARY_TEMPLATES[key]; patchWorkspace({ blocks: template.blocks.map((block) => ({ ...block, id: crypto.randomUUID() })), layout: template.layout, body: serializeLiterary(template) }); setTemplatesOpen(false); }}>{label}</Button>)}</div></DialogContent></Dialog>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 text-xs"><span className="font-semibold">{words}/{MAX_WORDS} words</span><span className="ml-auto text-muted-foreground">Draft changes are saved when you choose Save draft.</span></div></div>
    </div>
  );
}
