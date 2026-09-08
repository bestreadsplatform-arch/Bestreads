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

export type Draft = {
  id: string;
  title: string;
  summary: string;
  hashtags: string[];
  body: string;
  cover: number;
  coverImage?: string | undefined;
  buyLink?: string | undefined;
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
  saveDraft: (d: Omit<Draft, "id" | "createdAt" | "status">) => { ok: boolean; error?: string };
  publishDraft: (id: string) => Promise<AuthResult>;
  publishBook: (d: Omit<Draft, "id" | "createdAt" | "status">) => Promise<AuthResult>;
  refreshBooks: () => Promise<void>;
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
          { id: authUser.id, name: resolvedName, username: resolvedUsername, payment_tier_status: "free" },
          { onConflict: "id", ignoreDuplicates: false },
        )
        .select("id, name, username, payment_tier_status, biography, external_links")
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
          isPro: ["pro_monthly", "pro_annual"].includes((p.payment_tier_status ?? "").toLowerCase()),
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
          summary: r.summary ?? "",
          hashtags: r.hashtags ?? [],
          excerpt: (r.content ?? "").slice(0, 240),
          content: r.content ?? "",
          pages: r.pages ?? 0,
          cover: 1,
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
          buyLink: (r as Record<string, unknown>).buy_link as string | undefined,
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
      if (!user?.isPro && library.length >= FREE_LIBRARY_LIMIT) {
        return { ok: false, error: "Upgrade to Pro for an unlimited library." };
      }
      setLibrary((l) => [...l, bookId]);
      return { ok: true };
    },
    [library, user],
  );

  const saveDraft = useCallback(
    (d: Omit<Draft, "id" | "createdAt" | "status">) => {
      const currentDrafts = drafts.filter((x) => x.status === "draft");
      if (!user?.isPro && currentDrafts.length >= FREE_DRAFT_LIMIT) {
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
        buy_link: d.buyLink ?? null,
        pages: Math.max(1, Math.ceil((d.body.length || 1) / 900)),
        status: "published",
      } as Record<string, unknown>);
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
    saveDraft,
    publishDraft,
    publishBook,
    refreshBooks,
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
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useBestreads() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useBestreads must be used inside BestreadsProvider");
  return ctx;
}

export { FREE_DRAFT_LIMIT, FREE_LIBRARY_LIMIT };
