import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import {
  AUTHORS,
  GENRES,
  HOF_CODE,
  HOF_FEATURES,
  authorById,
  registerAuthors,
  type Author,
  type Book,
  type HofFeature,
  type HofMedia,
  type TimeFilter,
} from "./data";
import {
  emptyDoc,
  hydrateDoc,
  parsePanSettings,
  serializeLiterary,
  stripMarkdownLeaks,
  type DocBlock,
  type LiteraryLayout,
  type PanSettings,
} from "./document";

export type Tier = "free" | "pro_monthly" | "pro_annual";
export type View = "discover" | "studio" | "bookshelf" | "hall-of-fame" | "pricing" | "profile";

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  tier: Tier;
  isPro: boolean; // true for both pro_monthly and pro_annual
  isHallOfFameEditor: boolean;
};

import { type CoAuthor, type InboxItem, type Revision } from "./data";

export type Draft = {
  id: string;
  title: string;
  summary: string;
  hashtags: string[];
  body: string;
  blocks: DocBlock[];
  layout: LiteraryLayout;
  cover: number;
  coverImage?: string | undefined;
  bannerImage?: string | undefined;
  buyLink?: string | undefined;
  coauthors?: CoAuthor[];
  status: "draft" | "published";
  createdAt: string;
};

export type WorkspaceState = {
  nonce: number;
  draft: Draft;
};

type AuthResult = { ok: boolean; error?: string; message?: string; id?: string };

function blankDraft(): Draft {
  const doc = emptyDoc("serif");
  return {
    id: "",
    title: "",
    summary: "",
    hashtags: [],
    body: "",
    blocks: doc.blocks,
    layout: doc.layout,
    cover: 2,
    status: "draft",
    createdAt: new Date().toISOString(),
  };
}

function isUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function toPanSettings(d: Pick<Draft, "bannerImage" | "layout" | "blocks">): PanSettings {
  return {
    bannerImage: d.bannerImage,
    layout: d.layout,
    blocks: d.blocks,
  };
}

function publicationToDraft(r: {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  hashtags: string[] | null;
  cover_url: string | null;
  buy_link?: string | null;
  pan_settings: unknown;
  created_at: string;
  status: string | null;
}): Draft {
  const pan = parsePanSettings(r.pan_settings);
  const doc = hydrateDoc(r.content ?? "", pan);
  return {
    id: r.id,
    title: r.title,
    summary: r.summary ?? "",
    hashtags: r.hashtags ?? [],
    body: serializeLiterary(doc),
    blocks: doc.blocks,
    layout: doc.layout,
    cover: 2,
    coverImage: r.cover_url ?? undefined,
    bannerImage: pan?.bannerImage,
    buyLink: r.buy_link ?? undefined,
    status: r.status === "published" ? "published" : "draft",
    createdAt: r.created_at,
  };
}

type SignUpInput = {
  email: string;
  password: string;
  name: string;
  username: string;
  accessCode: string;
};

type Store = {
  user: SessionUser | null;
  authors: Author[];
  books: Book[];
  drafts: Draft[];
  filter: TimeFilter;
  genreSlots: (string | null)[];
  search: string;
  view: View;
  sidebarOpen: boolean;
  topTenCollapsed: boolean;
  feedTab: "for-you" | "following" | "saved";
  upvoted: string[];
  following: string[];
  library: string[];
  proSortEnabled: boolean;
  maxPages: number | null;
  minUpvotes: number | null;
  activeGenre: string | null;
  profileSort: "most-voted" | "oldest" | "newest";
  setProfileSort: (s: "most-voted" | "oldest" | "newest") => void;
  hofEditorCount: number;
  hofFeatures: HofFeature[];
  authLoading: boolean;
  readingBook: Book | null;
  openReading: (book: Book) => void;
  closeReading: () => void;
  viewProfileId: string | null;
  openProfile: (userId: string) => void;
  closeProfile: () => void;
  upvoteCount: (book: Book) => number;
  updateHofMedia: (authorId: string, media: HofMedia) => void;
  updateProfile: (fields: { name?: string; avatarUrl?: string; bio?: string; links?: { gumroad?: string; amazon?: string; twitter?: string } }) => Promise<AuthResult>;
  upgradeTier: (tier: Tier) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;

  setFilter: (f: TimeFilter) => void;
  setGenreSlot: (index: number, genre: string | null) => void;
  setSearch: (s: string) => void;
  setView: (v: View) => void;
  toggleSidebar: () => void;
  toggleTopTen: () => void;
  setFeedTab: (t: "for-you" | "following" | "saved") => void;
  toggleUpvote: (bookId: string) => void;
  toggleFollow: (authorId: string) => void;
  toggleLibrary: (bookId: string) => { ok: boolean; error?: string };
  setTier: (t: Tier) => void;
  workspace: WorkspaceState;
  openWorkspace: (draft?: Draft) => void;
  patchWorkspace: (fields: Partial<Draft>) => void;
  saveDraft: (d: Omit<Draft, "id" | "createdAt" | "status"> & { id?: string }) => Promise<AuthResult>;
  publishDraft: (id: string) => Promise<AuthResult>;
  publishBook: (d: Omit<Draft, "id" | "createdAt" | "status"> & { id?: string }) => Promise<AuthResult>;
  refreshBooks: () => Promise<void>;
  refreshDrafts: () => Promise<void>;
  deleteDraft: (id: string) => void;
  setMaxPages: (p: number | null) => void;
  setMinUpvotes: (v: number | null) => void;
  setActiveGenre: (g: string | null) => void;
  availableGenres: string[];
  hashtagSearch: string | null;
  visibleBooks: Book[];
  topTen: Book[];
  streamBooks: Book[];
  savedBooks: Book[];
  topAuthors: { author: Author; score: number; titles: number }[];
  inbox: InboxItem[];
  revisions: Revision[];
  inviteCoAuthor: (username: string, draftId?: string) => Promise<AuthResult>;
  acceptInvitation: (inboxId: string) => Promise<AuthResult>;
  declineInvitation: (inboxId: string) => Promise<AuthResult>;
  submitRevision: (draftId: string, newBody: string) => Promise<AuthResult>;
  approveRevision: (revisionId: string) => Promise<AuthResult>;
};

const StoreContext = createContext<Store | null>(null);

const FREE_LIBRARY_LIMIT = 5;
const FREE_DRAFT_LIMIT = 5;

export function BestreadsProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [authors, setAuthors] = useState<Author[]>(AUTHORS);

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [filter, setFilter] = useState<TimeFilter>("today");
  const [genreSlots, setGenreSlots] = useState<(string | null)[]>(["#POETRY", "#FICTION", "#NOIR"]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("discover");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [topTenCollapsed, setTopTenCollapsed] = useState(false);
  const [feedTab, setFeedTab] = useState<"for-you" | "following" | "saved">("for-you");
  const [upvoted, setUpvoted] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [library, setLibrary] = useState<string[]>([]);
  const [maxPages, setMaxPages] = useState<number | null>(null);
  const [minUpvotes, setMinUpvotes] = useState<number | null>(null);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [profileSort, setProfileSort] = useState<"most-voted" | "oldest" | "newest">("most-voted");
  const [hofEditorCount, setHofEditorCount] = useState(0);
  const [hofFeatures, setHofFeatures] = useState<HofFeature[]>(HOF_FEATURES);
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceState>({ nonce: 0, draft: blankDraft() });

  const openWorkspace = useCallback((draft?: Draft) => {
    setWorkspace((prev) => ({
      nonce: prev.nonce + 1,
      draft: draft ? { ...draft, blocks: draft.blocks?.length ? draft.blocks : emptyDoc(draft.layout ?? "serif").blocks, layout: draft.layout ?? "serif" } : blankDraft(),
    }));
    setView("studio");
  }, []);

  const patchWorkspace = useCallback((fields: Partial<Draft>) => {
    setWorkspace((prev) => ({ ...prev, draft: { ...prev.draft, ...fields } }));
  }, []);

  const updateHofMedia = useCallback((authorId: string, media: HofMedia) => {
    setHofFeatures((prev) => prev.map((f) => (f.authorId === authorId ? { ...f, media } : f)));
  }, []);

  const loadProfile = useCallback(async (authUser: { id: string; email?: string | null; user_metadata?: Record<string, string> }) => {
    try {
      const meta = authUser.user_metadata ?? {};
      const resolvedName = (meta.name as string | undefined) ?? authUser.email ?? "Reader";
      const resolvedUsername = (meta.username as string | undefined) ?? authUser.email?.split("@")[0] ?? "user";

      const { data: upserted, error: upsertError } = await supabase
        .from("users")
          .upsert(
          { id: authUser.id, name: resolvedName, username: resolvedUsername },
          { onConflict: "id", ignoreDuplicates: false },
        )
        .select("id, name, username, payment_tier_status, biography, external_links, avatar_url")
        .maybeSingle();

      if (upsertError) console.error("Failed to upsert users row:", upsertError);

      const row = upserted;
      const rawTier = (row?.payment_tier_status ?? "free").toLowerCase();
      const tier: Tier = rawTier === "pro_annual" ? "pro_annual" : rawTier === "pro_monthly" ? "pro_monthly" : "free";
      const isPro = tier !== "free";
      const links = (row?.external_links as { gumroad?: string; amazon?: string; twitter?: string } | null) ?? undefined;

      setUser({
        id: authUser.id,
        name: row?.name ?? resolvedName,
        username: row?.username ?? resolvedUsername,
        avatarUrl: row?.avatar_url ?? undefined,
        tier,
        isPro,
        isHallOfFameEditor: false,
      });

      // Update the live author registry with profile data
      registerAuthors([{
        id: authUser.id,
        name: row?.name ?? resolvedName,
        username: row?.username ?? resolvedUsername,
        bio: (row?.biography as string | null) ?? "",
        isPro,
        isHallOfFameEditor: false,
        links,
        avatarUrl: row?.avatar_url ?? undefined,
      }]);
    } catch (e) {
      console.error("Error loading profile:", e);
    }
  }, []);

  useEffect(() => {
    // Attach listener FIRST so we never miss events
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        void loadProfile(session.user);
      } else {
        setUser(null);
        if (event === "SIGNED_OUT") setAuthLoading(false);
      }
    });

    // Then check for an already-existing session (page refresh case)
    supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (error) console.error("getSession error:", error);
        if (data.session?.user) {
          await loadProfile(data.session.user);
        }
        setAuthLoading(false);
      })
      .catch((e) => {
        console.error("getSession threw:", e);
        setAuthLoading(false);
      });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  useEffect(() => {
    void supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("payment_tier_status", "pro")
      .then(({ count }) => setHofEditorCount(count ?? 0))
      .catch((e) => console.error("Error fetching hofEditorCount:", e));
  }, [user]);

    const refreshBooks = useCallback(async () => {
    try {
      const [publicationsRes, usersRes, coauthorsRes] = await Promise.all([
        supabase
          .from("publications")
          .select(
            "id, author_id, title, summary, content, hashtags, cover_url, pages, upvotes_count, reads_count, status, created_at, pan_settings, buy_link",
          )
          .eq("status", "published")
          .order("upvotes_count", { ascending: false }),
        supabase.from("users").select("id, name, username, payment_tier_status, biography, avatar_url"),
        supabase.from("publication_coauthors").select("*")
      ]);

      if (publicationsRes.error) console.error("Error fetching publications:", publicationsRes.error);
      if (usersRes.error) console.error("Error fetching users:", usersRes.error);

      const rows = publicationsRes.data ?? [];
      const people = usersRes.data ?? [];
      const coauthRows = coauthorsRes.data ?? [];

      if (people.length > 0) {
        const mapped: Author[] = people.map((p) => ({
          id: p.id,
          name: p.name,
          username: p.username,
          bio: p.biography ?? "",
          isPro: ["pro_monthly", "pro_annual"].includes((p.payment_tier_status ?? "").toLowerCase()),
          isHallOfFameEditor: false,
          avatarUrl: p.avatar_url ?? undefined,
        }));
        registerAuthors(mapped);
        setAuthors(mapped);
      }

      setBooks(
        rows.map((r) => {
          const pan = parsePanSettings(r.pan_settings);
          const doc = hydrateDoc(r.content ?? "", pan);
          const literary = serializeLiterary(doc);
          return {
          id: r.id,
          authorId: r.author_id,
          title: r.title,
          summary: r.summary ?? "",
          hashtags: r.hashtags ?? [],
          excerpt: literary.slice(0, 240),
          content: literary,
          blocks: doc.blocks,
          layout: doc.layout,
          pages: r.pages ?? 0,
          cover: 1,
          coverImage: r.cover_url ?? undefined,
          bannerImage: pan?.bannerImage,
          launchDate: r.created_at,
          status: "published" as const,
          coauthors: coauthRows
            .filter((c) => c.publication_id === r.id && (c.invitation_status === "accepted" || !c.invitation_status))
            .map((c) => ({
              id: c.user_id,
              role: c.role as "principal_author" | "helper",
              fullPermissions: c.full_permissions ?? false,
              invitationStatus: (c.invitation_status as CoAuthor["invitationStatus"]) ?? "accepted",
            })),
          upvotes: {
            today: r.upvotes_count ?? 0,
            week: r.upvotes_count ?? 0,
            month: r.upvotes_count ?? 0,
          },
          totalUpvotes: r.upvotes_count ?? 0,
          views: r.reads_count ?? 0,
          shares: 0,
          currentReads: 0,
          buyLink: r.buy_link ?? undefined,
          };
        }),
      );
    } catch (e) {
      console.error("Error refreshing books:", e);
    }
  }, []);

  const refreshInbox = useCallback(async () => {
    if (!user) {
      setInbox([]);
      return;
    }
    const { data, error } = await supabase
      .from("publication_coauthors")
      .select("*")
      .eq("user_id", user.id)
      .eq("invitation_status", "pending");
    if (error) {
      console.error("Error fetching inbox:", error);
      return;
    }
    const rows = data ?? [];
    const senderIds = [...new Set(rows.map((r) => r.invited_by))];
    const { data: senders } = senderIds.length
      ? await supabase.from("users").select("id, username").in("id", senderIds)
      : { data: [] as { id: string; username: string }[] };
    const names = new Map((senders ?? []).map((s) => [s.id, s.username]));
    setInbox(
      rows.map((d) => ({
        id: d.id,
        senderId: d.invited_by,
        senderUsername: names.get(d.invited_by) ?? "someone",
        receiverId: d.user_id,
        bookTitle: d.book_title || "Untitled",
        draftId: d.publication_id,
        status: "pending",
        createdAt: d.created_at,
      })),
    );
  }, [user]);

  const refreshDrafts = useCallback(async () => {
    if (!user) {
      setDrafts([]);
      return;
    }
    try {
      const [{ data: owned, error: ownedErr }, { data: accepted, error: accErr }] = await Promise.all([
        supabase
          .from("publications")
          .select("id, title, summary, content, hashtags, cover_url, pan_settings, created_at, status, buy_link")
          .eq("author_id", user.id)
          .eq("status", "draft")
          .order("created_at", { ascending: false }),
        supabase
          .from("publication_coauthors")
          .select("publication_id")
          .eq("user_id", user.id)
          .eq("invitation_status", "accepted"),
      ]);
      if (ownedErr) console.error("Error fetching drafts:", ownedErr);
      if (accErr) console.error("Error fetching accepted collabs:", accErr);

      const collabIds = [...new Set((accepted ?? []).map((r) => r.publication_id))];
      let collabPubs: typeof owned = [];
      if (collabIds.length > 0) {
        const { data } = await supabase
          .from("publications")
          .select("id, title, summary, content, hashtags, cover_url, pan_settings, created_at, status, buy_link")
          .in("id", collabIds)
          .eq("status", "draft");
        collabPubs = data ?? [];
      }

      const merged = new Map<string, Draft>();
      for (const row of [...(owned ?? []), ...(collabPubs ?? [])]) {
        merged.set(row.id, publicationToDraft(row));
      }
      setDrafts([...merged.values()]);
    } catch (e) {
      console.error("Error refreshing drafts:", e);
    }
  }, [user]);

  useEffect(() => {
    void refreshBooks();
  }, [refreshBooks, user]);

  useEffect(() => {
    if (!user) {
      setUpvoted([]);
      setInbox([]);
      setDrafts([]);
      return;
    }
    void supabase
      .from("upvotes_ledger")
      .select("publication_id")
      .eq("user_id", user.id)
      .then(({ data }) => setUpvoted((data ?? []).map((u) => u.publication_id)))
      .catch((e) => console.error("Error fetching upvotes:", e));

    void refreshInbox();
    void refreshDrafts();

    // For principal authors, fetch pending revisions for their publications
    // For local mock, we'll just fetch all pending revisions (requires RLS to allow)
    void supabase
      .from("publication_revisions")
      .select("*")
      .eq("status", "pending")
      .then(({ data }) => setRevisions((data ?? []).map(r => ({
        id: r.id,
        publicationId: r.publication_id,
        helperId: r.helper_id,
        proposedBody: r.proposed_body,
        status: r.status as "pending",
        createdAt: r.created_at
      }))))
      .catch((e) => console.error("Error fetching revisions:", e));
  }, [user, refreshInbox, refreshDrafts]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`publication-coauthor-inbox:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "publication_coauthors", filter: `user_id=eq.${user.id}` }, () => {
        void refreshInbox();
        void refreshDrafts();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, refreshInbox, refreshDrafts]);

  const signUp = useCallback(
    async ({ email, password, name, username, accessCode }: SignUpInput): Promise<AuthResult> => {
      const handle = username.replace(/^@/, "").trim().toLowerCase();
      const mail = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))
        return { ok: false, error: "Enter a valid email address." };
      if (password.length < 6)
        return { ok: false, error: "Password must be at least 6 characters." };
      if (!name.trim()) return { ok: false, error: "Display name is required." };
      if (!/^[a-z0-9._]{3,20}$/.test(handle))
        return { ok: false, error: "Username must be 3–20 chars: a–z, 0–9, dot or underscore." };

      const code = accessCode.trim();
      if (code.length > 0 && code !== HOF_CODE)
        return { ok: false, error: "That secret access code is not valid." };

      // Keep signup independent from an optional database RPC. The public users
      // policy already lets us check the unique handle before creating the account.
      const { data: existingUser, error: availabilityError } = await supabase
        .from("users")
        .select("id")
        .eq("username", handle)
        .maybeSingle();
      if (availabilityError)
        return { ok: false, error: "We could not check that username. Please try again." };
      if (existingUser)
        return { ok: false, error: `@${handle} is already taken. Try another handle.` };

      const { data: signupData, error } = await supabase.auth.signUp({
        email: mail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { name: name.trim(), username: handle },
        },
      });
      if (error) {
        // Supabase can rate-limit repeated confirmation emails while the account
        // already exists. Let a confirmed account enter immediately instead of
        // making the user submit the same signup form again.
        if (error.message.toLowerCase().includes("rate limit")) {
          const { data: existingSession, error: existingSignInError } = await supabase.auth.signInWithPassword({
            email: mail,
            password,
          });
          if (!existingSignInError && existingSession.user) {
            await loadProfile(existingSession.user);
            return { ok: true, message: "Welcome back. Your existing account is ready." };
          }
          if (existingSignInError?.message.toLowerCase().includes("email not confirmed")) {
            return {
              ok: false,
              error: "This account still needs email confirmation. Turn off Confirm email in Supabase Auth settings for testing, then sign in again.",
            };
          }
        }
        return { ok: false, error: error.message };
      }

      if (signupData.user && !signupData.session) {
        return {
          ok: false,
          error: "Your account was created, but email confirmation is still enabled. Turn off Confirm email in Supabase Auth settings for testing, then sign in again.",
        };
      }

      if (code === HOF_CODE) {
        const { data: redeemed } = await supabase.rpc("redeem_hof_code", { _code: code });
        const result = redeemed as { ok: boolean; error?: string } | null;
        if (result && !result.ok) return { ok: false, error: result.error ?? "Code rejected." };
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        return {
          ok: false,
          error:
            "Your account was created, but Supabase is still waiting for email confirmation. In Supabase Auth settings, turn off Confirm email for testing, then try signing in.",
        };
      }
      await loadProfile(session.session.user);
      return { ok: true };
    },
    [loadProfile],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const mail = email.trim().toLowerCase();
      if (!mail || !password) return { ok: false, error: "Enter your email and password." };
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: mail, password });
        if (error) return { ok: false, error: error.message };
        if (data.user) await loadProfile(data.user);
        return { ok: true };
      } catch {
        return { ok: false, error: "We could not reach Bestreads. Please try again." };
      }
    },
    [loadProfile],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);


  const toggleUpvote = useCallback(
    (bookId: string) => {
      if (!user) return;
      const has = upvoted.includes(bookId);
      const delta = has ? -1 : 1;
      setUpvoted((prev) => (has ? prev.filter((id) => id !== bookId) : [...prev, bookId]));
      setBooks((prev) =>
        prev.map((b) =>
          b.id === bookId
            ? {
              ...b,
              totalUpvotes: Math.max(0, b.totalUpvotes + delta),
              upvotes: {
                today: Math.max(0, b.upvotes.today + delta),
                week: Math.max(0, b.upvotes.week + delta),
                month: Math.max(0, b.upvotes.month + delta),
              },
            }
            : b,
        ),
      );
      void (async () => {
        if (has) {
          await supabase.from("upvotes_ledger").delete().eq("user_id", user.id).eq("publication_id", bookId);
        } else {
          await supabase.from("upvotes_ledger").insert({ user_id: user.id, publication_id: bookId, session_id: "anon" });
        }
      })();
    },
    [user, upvoted],
  );

  const upvoteCount = useCallback((book: Book) => book.upvotes[filter], [filter]);

  const toggleFollow = useCallback((authorId: string) => {
    if (user?.id === authorId) {
      toast.error("You cannot follow yourself.");
      return;
    }
    setFollowing((prev) =>
      prev.includes(authorId) ? prev.filter((id) => id !== authorId) : [...prev, authorId],
    );
  }, [user]);

  const toggleLibrary = useCallback(
    (bookId: string) => {
      if (library.includes(bookId)) {
        setLibrary((l) => l.filter((id) => id !== bookId));
        return { ok: true };
      }
      if (!user?.isPro && library.length >= FREE_LIBRARY_LIMIT) {
        return { ok: false, error: "Upgrade to Pro for an unlimited library." };
      }
      setLibrary((l) => [...l, bookId]);
      return { ok: true };
    },
    [library, user],
  );

  const saveDraft = useCallback(
    async (d: Omit<Draft, "id" | "createdAt" | "status"> & { id?: string }): Promise<AuthResult> => {
      if (!user) return { ok: false, error: "Sign in to save a draft." };
      const currentDrafts = drafts.filter((x) => x.status === "draft");
      const updating = !!(d.id && (drafts.some((x) => x.id === d.id) || isUuid(d.id)));
      if (!user.isPro && !updating && currentDrafts.length >= FREE_DRAFT_LIMIT) {
        return { ok: false, error: "Free accounts keep 5 drafts. Upgrade to Pro for unlimited." };
      }

      const doc = { layout: d.layout ?? "serif", blocks: d.blocks?.length ? d.blocks : emptyDoc().blocks };
      const literary = stripMarkdownLeaks(serializeLiterary(doc));
      const payload = {
        author_id: user.id,
        title: d.title.trim() || "Untitled",
        summary: d.summary,
        content: literary,
        hashtags: d.hashtags,
        cover_url: d.coverImage ?? null,
        buy_link: d.buyLink ?? null,
        pages: Math.max(1, Math.ceil((literary.length || 1) / 900)),
        status: "draft",
        pan_settings: toPanSettings({ ...d, layout: doc.layout, blocks: doc.blocks }),
      };

      const existingId = d.id && isUuid(d.id) ? d.id : undefined;
      if (existingId) {
        const { author_id: _authorId, ...updateRow } = payload;
        const { error } = await supabase.from("publications").update(updateRow).eq("id", existingId);
        if (error) return { ok: false, error: error.message };
        const saved: Draft = {
          ...d,
          id: existingId,
          body: literary,
          blocks: doc.blocks,
          layout: doc.layout,
          status: "draft",
          createdAt: drafts.find((x) => x.id === existingId)?.createdAt ?? new Date().toISOString(),
        };
        setDrafts((prev) => [saved, ...prev.filter((x) => x.id !== existingId)]);
        patchWorkspace({ id: existingId, body: literary, blocks: doc.blocks, layout: doc.layout });
        return { ok: true, id: existingId };
      }

      const { data, error } = await supabase.from("publications").insert(payload).select("id, created_at").maybeSingle();
      if (error) return { ok: false, error: error.message };
      const id = data?.id ?? "";
      const saved: Draft = {
        ...d,
        id,
        body: literary,
        blocks: doc.blocks,
        layout: doc.layout,
        status: "draft",
        createdAt: data?.created_at ?? new Date().toISOString(),
      };
      setDrafts((prev) => [saved, ...prev.filter((x) => x.id !== id)]);
      patchWorkspace({ id, body: literary, blocks: doc.blocks, layout: doc.layout });
      return { ok: true, id };
    },
    [drafts, user, patchWorkspace],
  );

  const publishBook = useCallback(
    async (d: Omit<Draft, "id" | "createdAt" | "status"> & { id?: string }): Promise<AuthResult> => {
      if (!user) return { ok: false, error: "Sign in to publish." };
      if (!d.title.trim()) return { ok: false, error: "Your text needs a title." };
      const doc = { layout: d.layout ?? "serif", blocks: d.blocks?.length ? d.blocks : emptyDoc().blocks };
      const literary = stripMarkdownLeaks(serializeLiterary(doc));
      const row = {
        author_id: user.id,
        title: d.title.trim(),
        summary: d.summary,
        content: literary,
        hashtags: d.hashtags,
        cover_url: d.coverImage ?? null,
        buy_link: d.buyLink ?? null,
        pages: Math.max(1, Math.ceil((literary.length || 1) / 900)),
        status: "published",
        pan_settings: toPanSettings({ ...d, layout: doc.layout, blocks: doc.blocks }),
      };
      const existingId = d.id && isUuid(d.id) ? d.id : undefined;
      const { error } = existingId
        ? await supabase.from("publications").update(row).eq("id", existingId).eq("author_id", user.id)
        : await supabase.from("publications").insert(row);
      if (error) return { ok: false, error: error.message };
      await refreshBooks();
      await refreshDrafts();
      return { ok: true, id: existingId };
    },
    [user, refreshBooks, refreshDrafts],
  );

  const publishDraft = useCallback(
    async (id: string): Promise<AuthResult> => {
      const draft = drafts.find((d) => d.id === id);
      if (!draft) return { ok: false, error: "Draft not found." };
      const res = await publishBook(draft);
      if (!res.ok) return res;
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      return { ok: true };
    },
    [drafts, publishBook],
  );

  const deleteDraft = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    if (isUuid(id)) {
      void supabase.from("publications").delete().eq("id", id);
    }
  }, []);

  const setTier = useCallback((t: Tier) => {
    setUser((u) => (u ? { ...u, tier: t, isPro: t !== "free" } : u));
  }, []);

  const upgradeTier = useCallback(async (t: Tier) => {
    if (!user) return;
    // Update Supabase
    const { error } = await supabase
      .from("users")
      .update({ payment_tier_status: t })
      .eq("id", user.id);
    if (error) console.error("Error updating tier:", error);
    // Update local state immediately for instant UI feedback
    setUser((u) => (u ? { ...u, tier: t, isPro: t !== "free" } : u));
  }, [user]);

  const updateProfile = useCallback(async (fields: {
    name?: string;
    avatarUrl?: string;
    bio?: string;
    links?: { gumroad?: string; amazon?: string; twitter?: string };
  }): Promise<AuthResult> => {
    if (!user) return { ok: false, error: "Not signed in." };
    const { error } = await supabase
      .from("users")
      .update({
        ...(fields.name ? { name: fields.name } : {}),
        ...(fields.bio !== undefined ? { biography: fields.bio } : {}),
        ...(fields.links !== undefined ? { external_links: fields.links } : {}),
        ...(fields.avatarUrl !== undefined ? { avatar_url: fields.avatarUrl } : {}),
      })
      .eq("id", user.id);
    if (error) return { ok: false, error: error.message };
    setUser((u) => u ? { ...u, ...(fields.name ? { name: fields.name! } : {}), ...(fields.avatarUrl ? { avatarUrl: fields.avatarUrl } : {}) } : u);
    // Refresh author registry
    registerAuthors([{
      id: user.id,
      name: fields.name ?? user.name,
      username: user.username,
      bio: fields.bio ?? "",
      isPro: user.isPro,
      isHallOfFameEditor: user.isHallOfFameEditor,
      avatarUrl: fields.avatarUrl,
      links: fields.links,
    }]);
    return { ok: true };
  }, [user]);

  const setGenreSlot = useCallback((index: number, genre: string | null) => {
    setGenreSlots((prev) => prev.map((g, i) => (i === index ? genre : g)));
  }, []);

  const hashtagSearch = useMemo(() => {
    const q = search.trim();
    return q.startsWith("#") && q.length > 1 ? q.toUpperCase() : null;
  }, [search]);


  const visibleBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = books.filter((b) => b.status === "published");
    if (q) {
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.summary.toLowerCase().includes(q) ||
          b.excerpt.toLowerCase().includes(q) ||
          b.hashtags.some((h) => h.toLowerCase().includes(q)) ||
          authorById(b.authorId).username.includes(q.replace("@", "")),
      );
    }
    if (activeGenre) list = list.filter((b) => b.hashtags.includes(activeGenre));
    if (user?.isPro && maxPages) list = list.filter((b) => b.pages <= maxPages);
    if (user?.isPro && minUpvotes) list = list.filter((b) => b.totalUpvotes >= minUpvotes);

    return [...list].sort((a, b) => {
      if (profileSort === "oldest") return new Date(a.launchDate).getTime() - new Date(b.launchDate).getTime();
      if (profileSort === "newest") return new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime();
      return b.upvotes[filter] - a.upvotes[filter];
    });
  }, [books, search, filter, user, maxPages, minUpvotes, activeGenre, profileSort]);

  const topTen = useMemo(() => visibleBooks.slice(0, 10), [visibleBooks]);
  const streamBooksBase = useMemo(
    () => (visibleBooks.length > 10 ? visibleBooks.slice(10) : visibleBooks),
    [visibleBooks],
  );
  const streamBooks = useMemo(
    () =>
      feedTab === "following"
        ? streamBooksBase.filter((b) => following.includes(b.authorId))
        : streamBooksBase,
    [streamBooksBase, feedTab, following],
  );

  const savedBooks = useMemo(
    () => books.filter((b) => library.includes(b.id)),
    [books, library],
  );

  const topAuthors = useMemo(() => {
    const map = new Map<string, { score: number; titles: number }>();
    books
      .filter((b) => b.status === "published")
      .forEach((b) => {
        const entry = map.get(b.authorId) ?? { score: 0, titles: 0 };
        entry.score += b.upvotes[filter];
        entry.titles += 1;
        map.set(b.authorId, entry);
      });
    return [...map.entries()]
      .map(([id, v]) => ({ author: authorById(id), score: v.score, titles: v.titles }))
      .sort((a, b) => b.score - a.score);
  }, [books, filter]);

  const inviteCoAuthor = useCallback(async (username: string, draftId?: string): Promise<AuthResult> => {
    if (!user) return { ok: false, error: "Not signed in." };
    if (!draftId || !isUuid(draftId)) {
      return { ok: false, error: "Save the draft before inviting a co-author." };
    }

    const maxCoAuthors = user.tier !== "free" ? 4 : 1;
    const { count } = await supabase
      .from("publication_coauthors")
      .select("id", { count: "exact", head: true })
      .eq("publication_id", draftId)
      .in("invitation_status", ["pending", "accepted"]);
    if ((count ?? 0) >= maxCoAuthors) {
      return { ok: false, error: user.tier === "free" ? "Free tier allows 1 co-author. Upgrade for 4." : "This text already has 4 co-authors." };
    }

    const handle = username.replace(/^@/, "").trim().toLowerCase();
    const { data: targetUser } = await supabase.from("users").select("id").eq("username", handle).maybeSingle();

    if (!targetUser) return { ok: false, error: "User not found." };
    if (targetUser.id === user.id) return { ok: false, error: "You cannot invite yourself." };

    const title =
      drafts.find((d) => d.id === draftId)?.title ||
      workspace.draft.title ||
      "Untitled";

    const { error } = await supabase.from("publication_coauthors").insert({
      publication_id: draftId,
      user_id: targetUser.id,
      invited_by: user.id,
      book_title: title.trim() || "Untitled",
      role: "helper",
      full_permissions: false,
      invitation_status: "pending",
    });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, [user, drafts, workspace.draft.title]);

  const acceptInvitation = useCallback(async (inboxId: string): Promise<AuthResult> => {
    if (!user) return { ok: false, error: "Not signed in." };
    const { data: row, error: fetchErr } = await supabase
      .from("publication_coauthors")
      .select("*")
      .eq("id", inboxId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (fetchErr) return { ok: false, error: fetchErr.message };
    if (!row) return { ok: false, error: "Invite not found." };

    const { error: updErr } = await supabase
      .from("publication_coauthors")
      .update({ invitation_status: "accepted" })
      .eq("id", inboxId)
      .eq("user_id", user.id);
    if (updErr) return { ok: false, error: updErr.message };

    setInbox((prev) => prev.filter((i) => i.id !== inboxId));
    await refreshDrafts();
    return { ok: true };
  }, [user, refreshDrafts]);

  const declineInvitation = useCallback(async (inboxId: string): Promise<AuthResult> => {
    if (!user) return { ok: false, error: "Not signed in." };
    const { error } = await supabase
      .from("publication_coauthors")
      .delete()
      .eq("id", inboxId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    setInbox((prev) => prev.filter((i) => i.id !== inboxId));
    setDrafts((prev) => prev.filter((d) => {
      const item = inbox.find((i) => i.id === inboxId);
      return !item || d.id !== item.draftId;
    }));
    return { ok: true };
  }, [user, inbox]);

  const submitRevision = useCallback(async (draftId: string, newBody: string): Promise<AuthResult> => {
    if (!user) return { ok: false, error: "Not signed in." };
    const { error } = await supabase.from("publication_revisions").insert({
      publication_id: draftId,
      helper_id: user.id,
      proposed_body: newBody,
      status: "pending"
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, [user]);

  const approveRevision = useCallback(async (revisionId: string): Promise<AuthResult> => {
    if (!user) return { ok: false, error: "Not signed in." };
    
    // In reality we'd update the draft body with the proposed_body
    // and then mark revision as approved.
    const { error } = await supabase.from("publication_revisions").update({ status: "approved" }).eq("id", revisionId);
    if (error) return { ok: false, error: error.message };
    
    setRevisions(prev => prev.filter(r => r.id !== revisionId));
    return { ok: true };
  }, [user]);

  const value: Store = {
    user,
    authors,
    books,
    drafts,
    filter,
    genreSlots,
    search,
    view,
    sidebarOpen,
    topTenCollapsed,
    feedTab,
    upvoted,
    following,
    library,
    proSortEnabled: user?.isPro ?? false,
    maxPages,
    minUpvotes,
    activeGenre,
    profileSort,
    setProfileSort,
    hofEditorCount,
    hofFeatures,
    authLoading,
    readingBook,
    openReading: (book) => setReadingBook(book),
    closeReading: () => setReadingBook(null),
    viewProfileId,
    openProfile: (id) => setViewProfileId(id),
    closeProfile: () => setViewProfileId(null),
    upvoteCount,
    updateHofMedia,
    updateProfile,
    upgradeTier,
    signUp,
    signIn,
    signOut,

    setFilter,
    setGenreSlot,
    setSearch,
    setView,
    toggleSidebar: () => setSidebarOpen((s) => !s),
    toggleTopTen: () => setTopTenCollapsed((s) => !s),
    setFeedTab,
    toggleUpvote,
    toggleFollow,
    toggleLibrary,
    setTier,
    workspace,
    openWorkspace,
    patchWorkspace,
    saveDraft,
    publishDraft,
    publishBook,
    refreshBooks,
    refreshDrafts,
    deleteDraft,
    setMaxPages,
    setMinUpvotes,
    setActiveGenre,
    availableGenres: GENRES,
    hashtagSearch,
    visibleBooks,
    topTen,
    streamBooks,
    savedBooks,
    topAuthors,
    inbox,
    revisions,
    inviteCoAuthor,
    acceptInvitation,
    declineInvitation,
    submitRevision,
    approveRevision,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useBestreads() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useBestreads must be used inside BestreadsProvider");
  return ctx;
}

export { FREE_DRAFT_LIMIT, FREE_LIBRARY_LIMIT };
