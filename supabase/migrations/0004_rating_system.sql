-- =============================================================
-- 0004：式神评分表改为「评分系统」结构
--   一个用户一条记录，shishen 字段为该评分系统中的式神评分数组
-- =============================================================

drop table if exists public.shishen_ratings;

create table public.shishen_ratings (
  id         bigserial primary key,
  user_id    bigint not null unique references public.users(id) on delete cascade,
  shishen    jsonb not null default '[]'::jsonb,  -- 式神评分对象数组
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shishen_ratings is '用户的式神评分系统（每个用户一条，shishen 为式神评分对象数组）';
comment on column public.shishen_ratings.shishen is '数组元素形如 {role,name,faction,jue_sheng,zhan_chang,jie_hou,guo_pai,xing_dong_dian,zeng_yi,qiang_shi_gou_ci,note,score,personal_score,evaluation}';

create index if not exists idx_shishen_ratings_user on public.shishen_ratings (user_id);
create index if not exists idx_shishen_ratings_data on public.shishen_ratings using gin (shishen);

-- 演示环境放行
alter table public.shishen_ratings enable row level security;
drop policy if exists shishen_ratings_all on public.shishen_ratings;
create policy shishen_ratings_all on public.shishen_ratings
  for all to anon, authenticated using (true) with check (true);

grant all on public.shishen_ratings to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
