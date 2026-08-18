-- Migration Script for Bestreads Supabase Tables

-- 1. Create `users` table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    biography TEXT,
    external_links JSONB,
    payment_tier_status TEXT DEFAULT 'free',
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create `publications` table
CREATE TABLE public.publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    pages INTEGER DEFAULT 0,
    cover_url TEXT,
    pan_settings JSONB,
    hashtags TEXT[],
    upvotes_count INTEGER DEFAULT 0,
    reads_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'published',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create `upvotes_ledger` table
CREATE TABLE public.upvotes_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    publication_id UUID NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, publication_id)
);

-- 4. Create `trophy_claims` table
CREATE TABLE public.trophy_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    phone_number TEXT,
    status TEXT DEFAULT 'pending',
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upvotes_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trophy_claims ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
-- INSERT: needed for upsert on login/signup (auth.uid() = id ensures users can only create their own row)
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Publications are viewable by everyone" ON public.publications FOR SELECT USING (true);
CREATE POLICY "Users can insert their own publications" ON public.publications FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update their own publications" ON public.publications FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete their own publications" ON public.publications FOR DELETE USING (auth.uid() = author_id);

CREATE POLICY "Upvotes ledger viewable by everyone" ON public.upvotes_ledger FOR SELECT USING (true);
CREATE POLICY "Users can insert their own upvotes" ON public.upvotes_ledger FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own upvotes" ON public.upvotes_ledger FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own trophy claims" ON public.trophy_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own trophy claims" ON public.trophy_claims FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── PATCH: if you already ran migration.sql, run only these two lines ──────
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
-- ─────────────────────────────────────────────────────────────────────────────

