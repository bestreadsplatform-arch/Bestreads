import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

export type Tier = "free" | "pro";
export type View = "discover" | "studio" | "bookshelf" | "hall-of-fame" | "pricing";

export type SessionUser = {
  id: string;
  name: string;
  username: string;
  tier: Tier;
  isHallOfFameEditor: boolean;
};

export type Draft = {
  id: string;
  title: string;
  summary: string;
  hashtags: string[];
  body: string;
  cover: number;
  coverImage?: string | undefined;
  status: "draft" | "published";
  createdAt: string;
};

type SignUpInput = {
  email: string;
  password: string;
  name: string;
  username: string;
  accessCode: string;
};

type AuthResult = { ok: boolean; error?: string };


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
  feedTab: "for-you" | "following";
  upvoted: string[];
  following: string[];
  library: string[];
  proSortEnabled: boolean;
  maxPages: number | null;
  activeGenre: string | null;
  profileSort: "most-voted" | "oldest" | "newest";
  setProfileSort: (s: "most-voted" | "oldest" | "newest") => void;
  hofEditorCount: number;
  hofFeatures: HofFeature[];
  authLoading: boolean;
  upvoteCount: (book: Book) => number;
  updateHofMedia: (authorId: string, media: HofMedia) => void;
  signUp: (input: SignUpInput) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;

  setFilter: (f: TimeFilter) => void;
  setGenreSlot: (index: number, genre: string | null) => void;
  setSearch: (s: string) => void;
  setView: (v: View) => void;
  toggleSidebar: () => void;
  toggleTopTen: () => void;
  setFeedTab: (t: "for-you" | "following") => void;
  toggleUpvote: (bookId: string) => void;
  toggleFollow: (authorId: string) => void;
  toggleLibrary: (bookId: string) => { ok: boolean; error?: string };
  setTier: (t: Tier) => void;
  saveDraft: (d: Omit<Draft, "id" | "createdAt" | "status">) => { ok: boolean; error?: string };
  publishDraft: (id: string) => Promise<AuthResult>;
  publishBook: (d: Omit<Draft, "id" | "createdAt" | "status">) => Promise<AuthResult>;
  refreshBooks: () => Promise<void>;
  deleteDraft: (id: string) => void;
  setMaxPages: (p: number | null) => void;
  setActiveGenre: (g: string | null) => void;
  availableGenres: string[];
  hashtagSearch: string | null;
  visibleBooks: Book[];
  topTen: Book[];
  streamBooks: Book[];
  topAuthors: { author: Author; score: number; titles: number }[];
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
  const [feedTab, setFeedTab] = useState<"for-you" | "following">("for-you");
  const [upvoted, setUpvoted] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>(["a3", "a7"]);
  const [library, setLibrary] = useState<string[]>(["b1", "b4"]);
  const [maxPages, setMaxPages] = useState<number | null>(null);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [profileSort, setProfileSort] = useState<"most-voted" | "oldest" | "newest">("most-voted");
  const [hofEditorCount, setHofEditorCount] = useState(0);
  const [hofFeatures, setHofFeatures] = useState<HofFeature[]>(HOF_FEATURES);

  const updateHofMedia = useCallback((authorId: string, media: HofMedia) => {
    setHofFeatures((prev) => prev.map((f) => (f.authorId === authorId ? { ...f, media } : f)));
  }, []);

  const loadProfile = useCallback(async (authUser: { id: string; email?: string | null; user_metadata?: Record<string, string> }) => {
    try {
      const meta = authUser.user_metadata ?? {};
      const resolvedName = (meta.name as string | undefined) ?? authUser.email ?? "Reader";
      const resolvedUsername = (meta.username as string | undefined) ?? authUser.email?.split("@")[0] ?? "user";

      // Always upsert so the foreign key row is guaranteed to exist
      // before any insert into `publications` is attempted.
      const { data: upserted, error: upsertError } = await supabase
        .from("users")
        .upsert(
          {
            id: authUser.id,
            name: resolvedName,
            username: resolvedUsername,
            payment_tier_status: "free",
          },
          {
            onConflict: "id",           // update the existing row if it's already there
            ignoreDuplicates: false,    // always refresh name/username if they changed
          },
        )
        .select("id, name, username, payment_tier_status")
        .maybeSingle();

      if (upsertError) {
        console.error("Failed to upsert users row:", upsertError);
      }

      // Prefer the upserted row's data (may have been set to "pro" outside the app)
      const row = upserted;
      setUser({
        id: authUser.id,
        name: row?.name ?? resolvedName,
        username: row?.username ?? resolvedUsername,
        tier: row?.payment_tier_status === "pro" ? "pro" : "free",
        isHallOfFameEditor: false,
      });
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
      const [publicationsRes, usersRes] = await Promise.all([
        supabase
          .from("publications")
          .select(
            "id, author_id, title, summary, content, hashtags, cover_url, pages, upvotes_count, reads_count, status, created_at, pan_settings",
          )
          .eq("status", "published")
          .order("upvotes_count", { ascending: false }),
        supabase.from("users").select("id, name, username, payment_tier_status, biography"),
      ]);

      if (publicationsRes.error) console.error("Error fetching publications:", publicationsRes.error);
      if (usersRes.error) console.error("Error fetching users:", usersRes.error);

      const rows = publicationsRes.data ?? [];
      const people = usersRes.data ?? [];

      if (people.length > 0) {
        const mapped: Author[] = people.map((p) => ({
          id: p.id,
          name: p.name,
          username: p.username,
          bio: p.biography ?? "",
          isPro: p.payment_tier_status === "pro",
          isHallOfFameEditor: false,
        }));
        registerAuthors(mapped);
        setAuthors(mapped);
      }

      setBooks(
        rows.map((r) => ({
          id: r.id,
          authorId: r.author_id,
          title: r.title,
          summary: r.summary,
          hashtags: r.hashtags ?? [],
          excerpt: (r.content ?? "").slice(0, 240),
          pages: r.pages ?? 0,
          cover: 1, // default or map from pan_settings if needed
          coverImage: r.cover_url ?? undefined,
          launchDate: r.created_at,
          status: "published" as const,
          upvotes: {
            today: r.upvotes_count ?? 0,
            week: r.upvotes_count ?? 0,
            month: r.upvotes_count ?? 0,
          },
          totalUpvotes: r.upvotes_count ?? 0,
          views: r.reads_count ?? 0,
          shares: 0,
          currentReads: 0,
        })),
      );
    } catch (e) {
      console.error("Error refreshing books:", e);
    }
  }, []);

  useEffect(() => {
    void refreshBooks();
  }, [refreshBooks, user]);

  useEffect(() => {
    if (!user) {
      setUpvoted([]);
      return;
    }
    void supabase
      .from("upvotes_ledger")
      .select("publication_id")
      .eq("user_id", user.id)
      .then(({ data }) => setUpvoted((data ?? []).map((u) => u.publication_id)))
      .catch((e) => console.error("Error fetching upvotes:", e));
  }, [user]);

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

      const { data: available } = await supabase.rpc("username_available", { _username: handle });
      if (available === false)
        return { ok: false, error: `@${handle} is already taken. Try another handle.` };

      const { error } = await supabase.auth.signUp({
        email: mail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { name: name.trim(), username: handle },
        },
      });
      if (error) return { ok: false, error: error.message };

      if (code === HOF_CODE) {
        const { data: redeemed } = await supabase.rpc("redeem_hof_code", { _code: code });
        const result = redeemed as { ok: boolean; error?: string } | null;
        if (result && !result.ok) return { ok: false, error: result.error ?? "Code rejected." };
      }

      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user) await loadProfile(session.session.user);
      return { ok: true };
    },
    [loadProfile],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) return { ok: false, error: error.message };
      if (data.user) await loadProfile(data.user);
      return { ok: true };
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
      if (user?.tier === "free" && library.length >= FREE_LIBRARY_LIMIT) {
        return { ok: false, error: "Free library holds 5 books. Upgrade to Pro for unlimited." };
      }
      setLibrary((l) => [...l, bookId]);
      return { ok: true };
    },
    [library, user],
  );

  const saveDraft = useCallback(
    (d: Omit<Draft, "id" | "createdAt" | "status">) => {
      const currentDrafts = drafts.filter((x) => x.status === "draft");
      if (user?.tier === "free" && currentDrafts.length >= FREE_DRAFT_LIMIT) {
        return { ok: false, error: "Free accounts keep 5 drafts. Upgrade to Pro for unlimited." };
      }
      setDrafts((prev) => [
        { ...d, id: `d${Date.now()}`, createdAt: new Date().toISOString(), status: "draft" },
        ...prev,
      ]);
      return { ok: true };
    },
    [drafts, user],
  );

  const publishBook = useCallback(
    async (d: Omit<Draft, "id" | "createdAt" | "status">): Promise<AuthResult> => {
      if (!user) return { ok: false, error: "Sign in to publish." };
      if (!d.title.trim()) return { ok: false, error: "Your text needs a title." };
      const { error } = await supabase.from("publications").insert({
        author_id: user.id,
        title: d.title.trim(),
        summary: d.summary,
        content: d.body,
        hashtags: d.hashtags,
        cover_url: d.coverImage ?? null,
        pages: Math.max(1, Math.ceil((d.body.length || 1) / 900)),
        status: "published",
      });
      if (error) return { ok: false, error: error.message };
      await refreshBooks();
      return { ok: true };
    },
    [user, refreshBooks],
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
  }, []);

  const setTier = useCallback((t: Tier) => {
    setUser((u) => (u ? { ...u, tier: t } : u));
  }, []);

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
    if (user?.tier === "pro" && maxPages) list = list.filter((b) => b.pages <= maxPages);

    // Sort logic for profile/feed
    return [...list].sort((a, b) => {
      if (profileSort === "oldest") return new Date(a.launchDate).getTime() - new Date(b.launchDate).getTime();
      if (profileSort === "newest") return new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime();
      return b.upvotes[filter] - a.upvotes[filter]; // most-voted default
    });
  }, [books, search, filter, user, maxPages, activeGenre, profileSort]);

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
    proSortEnabled: user?.tier === "pro",
    maxPages,
    activeGenre,
    profileSort,
    setProfileSort,
    hofEditorCount,
    hofFeatures,
    authLoading,
    upvoteCount,
    updateHofMedia,
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
    saveDraft,
    publishDraft,
    publishBook,
    refreshBooks,
    deleteDraft,
    setMaxPages,
    setActiveGenre,
    availableGenres: GENRES,
    hashtagSearch,
    visibleBooks,
    topTen,
    streamBooks,
    topAuthors,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useBestreads() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useBestreads must be used inside BestreadsProvider");
  return ctx;
}

export { FREE_DRAFT_LIMIT, FREE_LIBRARY_LIMIT };
