alter table public.visitor_questions
  add column if not exists response text,
  add column if not exists answered_at timestamptz;

create table if not exists public.social_links (
  singleton boolean primary key default true check (singleton),
  links jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.social_links enable row level security;
