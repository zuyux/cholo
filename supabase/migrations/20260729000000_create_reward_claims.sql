create table if not exists public.reward_claims (
  address text primary key,
  instagram_username text,
  instagram_connected boolean not null default false,
  x_user_id text unique,
  x_username text,
  x_access_token text,
  x_refresh_token text,
  x_token_expires_at timestamptz,
  x_connected boolean not null default false,
  x_following boolean not null default false,
  claimed boolean not null default false,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reward_claims enable row level security;
revoke all on public.reward_claims from anon, authenticated;

