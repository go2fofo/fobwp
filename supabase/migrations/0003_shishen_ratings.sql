-- =============================================================
-- 0003：式神评分系统重构
-- 1) 新建按用户的式神评分表 shishen_ratings
-- 2) 重建卡组评分表 deck_ratings（加入用户）
-- 3) 废弃旧的 shishen 表（默认数据迁移至管理员账号，见 pnpm seed）
-- 4) 创建默认管理员账号 fofobwp / fofo123
-- =============================================================

-- ---------- 1. 式神评分表 ----------
create table if not exists public.shishen_ratings (
  id             bigserial primary key,
  user_id        bigint not null references public.users(id) on delete cascade,
  role           text not null,          -- 关联 cards 中 type=式神 的 role
  name           text,
  faction        text,
  jue_sheng      int default 0,
  zhan_chang     int default 0,
  jie_hou        int default 0,
  guo_pai        int default 0,
  xing_dong_dian int default 0,
  zeng_yi        int default 0,
  qiang_shi_gou_ci text,
  note           text,
  score          int default 0,
  personal_score int,
  evaluation     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, role)
);

comment on table public.shishen_ratings is '用户对式神的评分（每个用户每个式神一条）';

create index if not exists idx_shishen_ratings_user on public.shishen_ratings (user_id);
create index if not exists idx_shishen_ratings_role on public.shishen_ratings (role);

-- ---------- 2. 卡组评分表重建 ----------
drop table if exists public.deck_ratings;
create table public.deck_ratings (
  id            bigserial primary key,
  user_id       bigint references public.users(id) on delete set null,
  user_name     text,
  name          text not null,
  faction       text,
  shishen_roles jsonb not null default '[]'::jsonb,  -- 卡组包含的式神 role 数组
  score         int default 0,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.deck_ratings is '用户的卡组评分';
comment on column public.deck_ratings.shishen_roles is '卡组包含的式神 role 数组';

create index if not exists idx_deck_ratings_user on public.deck_ratings (user_id);

-- ---------- 3. 废弃旧 shishen 表 ----------
drop table if exists public.shishen;

-- ---------- 4. 默认管理员账号 ----------
-- 密码 fofo123（scrypt 加盐哈希，与注册接口一致）
insert into public.users (username, password_hash, nickname, role)
values (
  'fofobwp',
  '50ee1887e869334214bbe13c42e1813a:bf6ac893950e961cd6ccd6f3a9f9c54d3187f776cc995b39808ed810d4145744eef65fcc2955876903c98d51bc25fc3274bb3db058df1a0811d36414105fc5ed',
  '管理员',
  'admin'
)
on conflict (username) do update set role = 'admin';

-- ---------- 5. 演示环境放行 ----------
alter table public.shishen_ratings enable row level security;
alter table public.deck_ratings    enable row level security;

drop policy if exists shishen_ratings_all on public.shishen_ratings;
create policy shishen_ratings_all on public.shishen_ratings
  for all to anon, authenticated using (true) with check (true);

drop policy if exists deck_ratings_all on public.deck_ratings;
create policy deck_ratings_all on public.deck_ratings
  for all to anon, authenticated using (true) with check (true);

grant all on public.shishen_ratings to anon, authenticated, service_role;
grant all on public.deck_ratings    to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
