import type { DocBlock, LiteraryLayout } from "./document";

export type TimeFilter = "today" | "week" | "month";

export type Author = {
  id: string;
  name: string;
  username: string;
  bio: string;
  avatarUrl?: string;
  isPro: boolean;
  isHallOfFameEditor: boolean;
  links?: { gumroad?: string; amazon?: string; twitter?: string };
};

export type CoAuthor = {
  id: string;
  role: "principal_author" | "helper";
  fullPermissions: boolean;
  invitationStatus?: "pending" | "accepted" | "declined";
};

export type Book = {
  id: string;
  authorId: string;
  coauthors?: CoAuthor[];
  title: string;
  summary: string;
  hashtags: string[];
  excerpt: string;
  content: string;
  blocks?: DocBlock[];
  layout?: LiteraryLayout;
  pages: number;
  cover: number; // palette index 0-9
  coverImage?: string | undefined;
  bannerImage?: string | undefined;
  launchDate: string;
  status: "published" | "draft";
  upvotes: Record<TimeFilter, number>;
  totalUpvotes: number;
  views: number;
  shares: number;
  currentReads: number;
  buyLink?: string | undefined;
  store?: { amazon?: string; gumroad?: string } | undefined;
};

export type InboxItem = {
  id: string;
  senderId: string;
  senderUsername: string;
  receiverId: string;
  bookTitle: string;
  draftId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
};

export type Revision = {
  id: string;
  publicationId: string;
  helperId: string;
  proposedBody: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

export const HOF_CODE = "thof1856!";

export const COVER_PALETTES = [
  { bg: "oklch(0.42 0.09 30)", fg: "oklch(0.96 0.02 85)" },
  { bg: "oklch(0.34 0.06 250)", fg: "oklch(0.95 0.02 85)" },
  { bg: "oklch(0.55 0.12 145)", fg: "oklch(0.98 0.01 85)" },
  { bg: "oklch(0.78 0.13 78)", fg: "oklch(0.25 0.04 55)" },
  { bg: "oklch(0.28 0.02 60)", fg: "oklch(0.93 0.02 85)" },
  { bg: "oklch(0.68 0.14 25)", fg: "oklch(0.99 0.01 85)" },
  { bg: "oklch(0.5 0.1 320)", fg: "oklch(0.97 0.01 85)" },
  { bg: "oklch(0.88 0.05 100)", fg: "oklch(0.3 0.04 60)" },
  { bg: "oklch(0.45 0.08 195)", fg: "oklch(0.97 0.01 85)" },
  { bg: "oklch(0.62 0.09 60)", fg: "oklch(0.2 0.03 55)" },
];

export const GENRES = [
  "#POETRY",
  "#FICTION",
  "#MEMOIR",
  "#ESSAY",
  "#SHORTSTORY",
  "#HISTORY",
  "#NATURE",
  "#ROMANCE",
  "#PHILOSOPHY",
  "#NOIR",
];

export const AUTHORS: Author[] = [
  {
    id: "a1",
    name: "Elena Vasquez",
    username: "elena.inkwell",
    bio: "Writes at dawn, edits at dusk. Barcelona.",
    isPro: true,
    isHallOfFameEditor: false,
  },
  {
    id: "a2",
    name: "Elena Moretti",
    username: "moretti.pages",
    bio: "Slow prose from a loud city.",
    isPro: false,
    isHallOfFameEditor: false,
  },
  {
    id: "a3",
    name: "Martha Quill",
    username: "marthaq",
    bio: "Poetry that refuses to hurry.",
    isPro: true,
    isHallOfFameEditor: false,
  },
  {
    id: "a4",
    name: "Martha Adeyemi",
    username: "adeyemi.longform",
    bio: "Essays on inheritance and rivers.",
    isPro: false,
    isHallOfFameEditor: false,
  },
  {
    id: "a5",
    name: "Tomas Lind",
    username: "lind.nordic",
    bio: "Cold light, warm sentences.",
    isPro: true,
    isHallOfFameEditor: false,
  },
  {
    id: "a6",
    name: "Ruth Okonjo",
    username: "ruthwrites",
    bio: "Short stories, no shortcuts.",
    isPro: false,
    isHallOfFameEditor: false,
  },
  {
    id: "a7",
    name: "Hana Sato",
    username: "hana.margins",
    bio: "Marginalia as a way of life.",
    isPro: true,
    isHallOfFameEditor: false,
  },
  {
    id: "a8",
    name: "Owen Brice",
    username: "brice.noir",
    bio: "Rain, streetlights, unreliable narrators.",
    isPro: false,
    isHallOfFameEditor: false,
  },
  {
    id: "a9",
    name: "Ida Fenn",
    username: "idafenn",
    bio: "Nature writing from the estuary.",
    isPro: true,
    isHallOfFameEditor: false,
  },
  {
    id: "a10",
    name: "Cyrus Malik",
    username: "cyrus.folio",
    bio: "Philosophy in plain clothes.",
    isPro: false,
    isHallOfFameEditor: false,
  },
];

export const BOOKS: Book[] = [];

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}


/** Live registry of real authors loaded from the database. */
const liveAuthors = new Map<string, Author>();

export function registerAuthors(list: Author[]) {
  list.forEach((a) => liveAuthors.set(a.id, a));
}

export const authorById = (id: string): Author =>
  liveAuthors.get(id) ??
  AUTHORS.find((a) => a.id === id) ?? {
    id,
    name: "Unknown writer",
    username: "unknown",
    bio: "",
    isPro: false,
    isHallOfFameEditor: false,
  };

/* ---------- CEST reset logic (UTC+2) ---------- */

const CEST_OFFSET_MS = 2 * 60 * 60 * 1000;

export function cestNow(now = new Date()) {
  return new Date(now.getTime() + CEST_OFFSET_MS);
}

/** Start of the current pool window, expressed as a real (UTC) Date. */
export function poolStart(filter: TimeFilter, now = new Date()): Date {
  const c = cestNow(now);
  const y = c.getUTCFullYear();
  const m = c.getUTCMonth();
  const d = c.getUTCDate();
  let startCest: number;
  if (filter === "today") {
    startCest = Date.UTC(y, m, d);
  } else if (filter === "week") {
    const dow = (c.getUTCDay() + 6) % 7; // Monday = 0
    startCest = Date.UTC(y, m, d - dow);
  } else {
    startCest = Date.UTC(y, m, 1);
  }
  return new Date(startCest - CEST_OFFSET_MS);
}

export function nextReset(filter: TimeFilter, now = new Date()): Date {
  const c = cestNow(now);
  const y = c.getUTCFullYear();
  const m = c.getUTCMonth();
  const d = c.getUTCDate();
  let endCest: number;
  if (filter === "today") endCest = Date.UTC(y, m, d + 1);
  else if (filter === "week") {
    const dow = (c.getUTCDay() + 6) % 7;
    endCest = Date.UTC(y, m, d - dow + 7);
  } else endCest = Date.UTC(y, m + 1, 1);
  return new Date(endCest - CEST_OFFSET_MS);
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const dd = Math.floor(total / 86400);
  const hh = Math.floor((total % 86400) / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return dd > 0 ? `${dd}d ${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

/* ---------- analytics series ---------- */

export function hourlySeries(book: Book) {
  const h = hash(book.id);
  const hours = cestNow().getUTCHours() + 1;
  return Array.from({ length: hours }, (_, i) => {
    const w = 1 + Math.sin((i / 24) * Math.PI * 2 + (h % 7)) * 0.6;
    return {
      label: `${String(i).padStart(2, "0")}:00`,
      reads: Math.round(6 * w + ((h + i * 13) % 9)),
      currentReads: Math.round(2 * w + ((h + i * 7) % 4)),
      upvotes: Math.round(2 * w + ((h + i * 5) % 3)),
      shares: Math.round(w + ((h + i * 3) % 2)),
    };
  });
}

export function dailySeries(book: Book, days: number) {
  const h = hash(book.id);
  const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return Array.from({ length: days }, (_, i) => {
    const w = 1 + Math.cos((i / days) * Math.PI * 3 + (h % 5)) * 0.5;
    return {
      label: days === 7 ? names[i] : `${i + 1}`,
      reads: Math.round(48 * w + ((h + i * 17) % 40)),
      currentReads: Math.round(11 * w + ((h + i * 11) % 9)),
      upvotes: Math.round(14 * w + ((h + i * 9) % 12)),
      shares: Math.round(4 * w + ((h + i * 5) % 5)),
    };
  });
}

/* ---------- Hall of Fame ---------- */

export type HofFeature = {
  authorId: string;
  headline: string;
  standfirst: string;
  quote: string;
  interview: { q: string; a: string }[];
  audioMinutes: number;
  videoTitle: string;
  media: HofMedia;
};

export type ChatMessage = { id: string; role: "moderator" | "author"; text: string };

export type HofMedia =
  | { kind: "audio"; url: string; minutes: number }
  | { kind: "video"; url: string; title: string }
  | { kind: "chat"; authorName: string; messages: ChatMessage[] };

export const HOF_ISSUE = {
  issue: "No. 24",
  cadence: "Every 2–3 semanas",
  window: "16 Aug – 2 Sep 2026",
  editorial:
    "Five writers who, in the last three weeks, made thousands of readers stop scrolling and start reading. No algorithms wrote these pages. No machine drafted these sentences. Every word below came out of a human head, at a human hour, usually too late at night.",
};

export const HOF_FEATURES: HofFeature[] = [
  {
    authorId: "a3",
    headline: "The Poet Who Writes on Receipts",
    standfirst: "Martha Quill on winter, thrift, and why a poem should fit in a coat pocket.",
    quote: "A poem that needs a whole page is usually two poems arguing.",
    interview: [
      { q: "Why receipts?", a: "They're free, they're small, and they curl. A curling poem tells you when to stop." },
      { q: "Do you revise?", a: "Constantly. The receipt is the first draft; the ninth draft is the one people read." },
      { q: "Advice for new writers?", a: "Write the thing you keep almost telling people at parties." },
    ],
    audioMinutes: 18,
    videoTitle: "Reading: 'Rope, Bread, Weather' — live from Leeds",
    media: {
      kind: "chat",
      authorName: "Martha Quill",
      messages: [
        { id: "m1", role: "moderator", text: "Martha — you write on receipts. Why?" },
        { id: "m2", role: "author", text: "They're free, they're small, and they curl." },
        { id: "m3", role: "author", text: "A curling poem tells you exactly when to stop." },
        { id: "m4", role: "moderator", text: "And the ninth draft?" },
        { id: "m5", role: "author", text: "That's the one people are allowed to read." },
      ],
    },
  },
  {
    authorId: "a1",
    headline: "A Year of Tides",
    standfirst: "Elena Vasquez turned a fishing village ledger into the season's most upvoted novel.",
    quote: "Research is just eavesdropping with a notebook and better manners.",
    interview: [
      { q: "How long did The Salt Almanac take?", a: "Four winters. The summers were for forgetting it." },
      { q: "Hardest chapter?", a: "The one where nothing happens. Those are always the hardest." },
    ],
    audioMinutes: 24,
    videoTitle: "Studio call: building a year-long structure",
    media: { kind: "audio", url: "", minutes: 24 },
  },
  {
    authorId: "a7",
    headline: "Notes in the Edges",
    standfirst: "Hana Sato collected fifteen years of marginalia into a memoir about attention.",
    quote: "I don't own most of the books I've written in. That feels correct.",
    interview: [
      { q: "First margin note?", a: "'He is lying' — age eleven, in a library copy. I still stand by it." },
      { q: "Digital or paper?", a: "Paper. Pencil. Nothing that syncs." },
    ],
    audioMinutes: 12,
    videoTitle: "Video conference: Marginalia, one year later",
    media: { kind: "video", url: "", title: "Video conference: Marginalia, one year later" },
  },
  {
    authorId: "a9",
    headline: "Six Months of Water",
    standfirst: "Ida Fenn's estuary field notes became a slow-burning nature classic.",
    quote: "Nothing on the estuary happens fast, which is why nobody films it.",
    interview: [
      { q: "Best hour to write?", a: "The hour before the tide turns. Everything is waiting, including me." },
      { q: "Do you edit outdoors?", a: "Never. Outdoors is for noticing; indoors is for lying about what you noticed." },
    ],
    audioMinutes: 31,
    videoTitle: "Walk-and-talk: the estuary at low water",
    media: { kind: "audio", url: "", minutes: 31 },
  },
  {
    authorId: "a6",
    headline: "Nine Doors, One Building",
    standfirst: "Ruth Okonjo built a story cycle out of a single apartment block.",
    quote: "Every neighbour is a novel you're not allowed to read.",
    interview: [
      { q: "Did anyone recognise themselves?", a: "Three people. Two were flattered. One moved." },
      { q: "Next project?", a: "The same building, forty years earlier." },
    ],
    audioMinutes: 21,
    videoTitle: "Recorded panel: the short story is not a warm-up",
    media: {
      kind: "chat",
      authorName: "Ruth Okonjo",
      messages: [
        { id: "m1", role: "moderator", text: "Nine doors, one building. Did neighbours recognise themselves?" },
        { id: "m2", role: "author", text: "Three did. Two were flattered." },
        { id: "m3", role: "author", text: "One moved out." },
        { id: "m4", role: "moderator", text: "Next project?" },
        { id: "m5", role: "author", text: "The same building, forty years earlier." },
      ],
    },
  },
];
