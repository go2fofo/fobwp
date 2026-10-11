-- 演示环境：为所有业务表放行 anon / authenticated 读写
-- （若 0001 中 disable rls 未生效，本策略同样保证可读写）

alter table public.cards        enable row level security;
alter table public.shishen      enable row level security;
alter table public.deck_ratings enable row level security;
alter table public.users        enable row level security;

drop policy if exists cards_all on public.cards;
create policy cards_all on public.cards
  for all to anon, authenticated using (true) with check (true);

drop policy if exists shishen_all on public.shishen;
create policy shishen_all on public.shishen
  for all to anon, authenticated using (true) with check (true);

drop policy if exists deck_ratings_all on public.deck_ratings;
create policy deck_ratings_all on public.deck_ratings
  for all to anon, authenticated using (true) with check (true);

drop policy if exists users_all on public.users;
create policy users_all on public.users
  for all to anon, authenticated using (true) with check (true);

grant all on public.cards        to anon, authenticated, service_role;
grant all on public.shishen      to anon, authenticated, service_role;
grant all on public.deck_ratings to anon, authenticated, service_role;
grant all on public.users        to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
