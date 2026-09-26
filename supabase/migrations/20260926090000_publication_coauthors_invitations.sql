create table if not exists public.publication_coauthors (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.publications(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  invited_by uuid not null references public.users(id) on delete cascade,
  book_title text not null default 'Untitled',
  role text not null default 'helper' check (role in ('principal_author', 'helper')),
  full_permissions boolean not null default false,
  invitation_status text not null default 'pending' check (invitation_status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (publication_id, user_id)
);

alter table public.publication_coauthors enable row level security;
create policy "Invitees can view their invitations" on public.publication_coauthors
  for select to authenticated using (auth.uid() = user_id or auth.uid() = invited_by);
create policy "Authors can create invitations" on public.publication_coauthors
  for insert to authenticated with check (auth.uid() = invited_by);
create policy "Invitees can accept invitations" on public.publication_coauthors
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Invitees can decline invitations" on public.publication_coauthors
  for delete to authenticated using (auth.uid() = user_id);

alter table public.publication_coauthors replica identity full;
