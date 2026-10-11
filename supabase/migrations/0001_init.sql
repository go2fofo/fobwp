-- =============================================================
-- 《阴阳师：百闻牌》卡牌图鉴与卡组模拟器 数据库结构
-- 请先在 Supabase SQL Editor 中执行本文件
-- =============================================================

-- 1. 卡牌表（来源：cards_extracted.json）
create table if not exists public.cards (
  id         bigint primary key,
  name       text not null,
  role       text,
  type       text,
  xiyoudu    text,
  stage      text,
  ll         text,
  sm         text,
  "desc"     text,
  keyword    text,
  faction    text,
  alias      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

comment on table  public.cards is '卡牌数据（式神牌/法术/战斗/形态/结界等）';
comment on column public.cards.role is '所属式神编号';
comment on column public.cards.xiyoudu is '稀有度：R/SR/SSR 等';
comment on column public.cards.stage is '勾次阶段';
comment on column public.cards.ll is '力量';
comment on column public.cards.sm is '生命';
comment on column public.cards.alias is '别称数组';

-- 2. 式神表（来源：shishen_data.json，含评分）
create table if not exists public.shishen (
  id                bigint primary key,
  role              text,
  name              text not null,
  jue_sheng         int default 0,
  zhan_chang        int default 0,
  jie_hou           int default 0,
  guo_pai           int default 0,
  xing_dong_dian    int default 0,
  zeng_yi           int default 0,
  qiang_shi_gou_ci  text,
  faction           text,
  note              text,
  score             int default 0,
  personal_score    int,
  evaluation        text,
  created_at        timestamptz not null default now()
);

comment on table  public.shishen is '式神评测与属性数据';
comment on column public.shishen.jue_sheng is '决胜能力评分';
comment on column public.shishen.zhan_chang is '站场能力评分';
comment on column public.shishen.jie_hou is '解后能力评分';
comment on column public.shishen.guo_pai is '过牌能力评分';
comment on column public.shishen.xing_dong_dian is '行动点效率';
comment on column public.shishen.zeng_yi is '增益能力评分';

-- 3. 卡组评分表
create table if not exists public.deck_ratings (
  id          bigserial primary key,
  name        text not null,
  faction     text,
  shishen_ids jsonb not null default '[]'::jsonb,
  score       int default 0,
  note        text,
  author      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.deck_ratings is '卡组评分数据';
comment on column public.deck_ratings.shishen_ids is '卡组包含的式神 id 数组';

-- 4. 用户表（自定义登录注册，不使用 Supabase Auth）
create table if not exists public.users (
  id            bigserial primary key,
  username      text unique not null,
  password_hash text not null,
  nickname      text,
  role          text not null default 'user',
  created_at    timestamptz not null default now()
);

comment on table public.users is '自定义用户表';

-- 索引：GIN 加速 jsonb 查询，普通索引加速过滤
create index if not exists idx_cards_role      on public.cards (role);
create index if not exists idx_cards_type      on public.cards (type);
create index if not exists idx_cards_faction   on public.cards (faction);
create index if not exists idx_cards_alias     on public.cards using gin (alias);
create index if not exists idx_shishen_faction on public.shishen (faction);
create index if not exists idx_shishen_score   on public.shishen (score desc);

-- 演示环境：关闭 RLS，允许 anon key 直接读写（如需上线请自行开启并配置策略）
alter table public.cards         disable row level security;
alter table public.shishen       disable row level security;
alter table public.deck_ratings  disable row level security;
alter table public.users         disable row level security;

grant all on public.cards        to anon, authenticated, service_role;
grant all on public.shishen      to anon, authenticated, service_role;
grant all on public.deck_ratings to anon, authenticated, service_role;
grant all on public.users        to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
