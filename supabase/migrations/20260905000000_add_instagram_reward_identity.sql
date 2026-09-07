-- Verified Instagram identities cannot be linked to multiple reward wallets.
alter table public.reward_claims
  add column if not exists instagram_user_id text;
create unique index if not exists reward_claims_instagram_user_id_key
  on public.reward_claims (instagram_user_id);
-- Legacy Instagram flags without an OAuth identity are not authentication proof.
update public.reward_claims set instagram_connected = false
where instagram_user_id is null and instagram_connected = true;
