-- ============================================
-- WhereToGO 数据库 Schema
-- 目标：兼容当前代码，同时转向双账号、共享私密空间的结构
-- 在 Supabase SQL Editor 中一次性运行
-- ============================================

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ============================================
-- 通用函数
-- 成员资料
-- ============================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext unique,
  display_name text,
  font_family text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles add column if not exists font_family text;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, font_family)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    null
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

create or replace function public.is_shared_member()
returns boolean
language sql
stable
as $$
  select
    auth.role() = 'authenticated'
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
    );
$$;

-- ============================================
-- 成员资料触发器
-- ============================================

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

-- ============================================
-- 地点与图片
-- ============================================

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  name text not null unique,
  description text,
  impression text,
  departure text,
  start_date date,
  end_date date,
  main_image text,
  music_title text,
  music_artist text,
  music_url text,
  music_note text,
  lng numeric(9, 6),
  lat numeric(9, 6),
  color text default '#FFFF00',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.cities add column if not exists main_image_path text;
alter table public.cities add column if not exists main_image_bucket text default 'cities-images';

create table if not exists public.city_images (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete cascade,
  owner_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  url text not null,
  storage_path text,
  storage_bucket text default 'cities-images',
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.city_images add column if not exists storage_path text;
alter table public.city_images add column if not exists storage_bucket text default 'cities-images';
alter table public.city_images alter column url drop not null;

create table if not exists public.city_comments (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete cascade,
  owner_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  author_name text not null,
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_cities_sort_order on public.cities(sort_order);
create index if not exists idx_city_images_city_id on public.city_images(city_id);
create index if not exists idx_city_images_sort_order on public.city_images(sort_order);
create index if not exists idx_city_comments_city_id on public.city_comments(city_id);
create index if not exists idx_city_comments_created_at on public.city_comments(created_at desc);

drop trigger if exists set_cities_updated_at on public.cities;
create trigger set_cities_updated_at
before update on public.cities
for each row execute procedure public.set_updated_at();

-- ============================================
-- Firsts
-- 说明：保留当前代码使用的 date/description 字段
-- 后续可逐步迁移到 title/content 的正式结构
-- ============================================

create table if not exists public.firsts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  title text,
  date date not null,
  description text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_firsts_date on public.firsts(date);

drop trigger if exists set_firsts_updated_at on public.firsts;
create trigger set_firsts_updated_at
before update on public.firsts
for each row execute procedure public.set_updated_at();

-- ============================================
-- Letters
-- ============================================

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  sender text,
  recipient text,
  date text,
  content text,
  is_draft boolean default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_letters_updated_at on public.letters;
create trigger set_letters_updated_at
before update on public.letters
for each row execute procedure public.set_updated_at();

-- ============================================
-- Keywords / Energy
-- 保留当前 user_id 文本字段，避免现有页面立刻失效
-- ============================================

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  user_id text not null,
  date date not null,
  keyword text not null,
  quality text not null check (quality in ('high', 'medium', 'low', 'none')),
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_id, date, keyword)
);

create table if not exists public.keyword_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  user_id text not null,
  keyword text not null,
  content text not null,
  is_completed boolean default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_keywords (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  user_id text not null,
  keyword text not null,
  year integer not null default extract(year from timezone('utc', now()))::integer,
  status text not null default 'active' check (status in ('active', 'archived')),
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(user_id, year, keyword, status)
);

create index if not exists idx_user_keywords_user_year_status
on public.user_keywords(user_id, year, status, sort_order);

create index if not exists idx_user_keywords_archived_at
on public.user_keywords(archived_at desc);

create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_app_config_updated_at on public.app_config;
create trigger set_app_config_updated_at
before update on public.app_config
for each row execute procedure public.set_updated_at();

drop trigger if exists set_user_keywords_updated_at on public.user_keywords;
create trigger set_user_keywords_updated_at
before update on public.user_keywords
for each row execute procedure public.set_updated_at();

-- ============================================
-- RLS
-- 约定：只允许 authenticated 成员访问
-- 建议在 Supabase Auth 中关闭公开注册，只邀请你和男朋友两个邮箱
-- ============================================

alter table public.profiles enable row level security;
alter table public.cities enable row level security;
alter table public.city_images enable row level security;
alter table public.city_comments enable row level security;
alter table public.firsts enable row level security;
alter table public.letters enable row level security;
alter table public.checkins enable row level security;
alter table public.keyword_tasks enable row level security;
alter table public.user_keywords enable row level security;
alter table public.app_config enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "shared_members_all_cities" on public.cities;
create policy "shared_members_all_cities"
on public.cities
for all
using (public.is_shared_member())
with check (public.is_shared_member());

drop policy if exists "shared_members_all_city_images" on public.city_images;
create policy "shared_members_all_city_images"
on public.city_images
for all
using (public.is_shared_member())
with check (public.is_shared_member());

drop policy if exists "shared_members_all_city_comments" on public.city_comments;
create policy "shared_members_all_city_comments"
on public.city_comments
for all
using (public.is_shared_member())
with check (public.is_shared_member());

drop policy if exists "shared_members_all_firsts" on public.firsts;
create policy "shared_members_all_firsts"
on public.firsts
for all
using (public.is_shared_member())
with check (public.is_shared_member());

drop policy if exists "shared_members_all_letters" on public.letters;
create policy "shared_members_all_letters"
on public.letters
for all
using (public.is_shared_member())
with check (public.is_shared_member());

drop policy if exists "shared_members_all_checkins" on public.checkins;
create policy "shared_members_all_checkins"
on public.checkins
for all
using (public.is_shared_member())
with check (public.is_shared_member());

drop policy if exists "shared_members_all_keyword_tasks" on public.keyword_tasks;
create policy "shared_members_all_keyword_tasks"
on public.keyword_tasks
for all
using (public.is_shared_member())
with check (public.is_shared_member());

drop policy if exists "shared_members_all_user_keywords" on public.user_keywords;
create policy "shared_members_all_user_keywords"
on public.user_keywords
for all
using (public.is_shared_member())
with check (public.is_shared_member());

drop policy if exists "shared_members_all_app_config" on public.app_config;
create policy "shared_members_all_app_config"
on public.app_config
for all
using (public.is_shared_member())
with check (public.is_shared_member());

-- ============================================
-- Storage
-- 城市照片改为 private bucket + signed URL
-- 这样只有已登录共享成员才能读取
-- ============================================

insert into storage.buckets (id, name, public)
values ('firsts-images', 'firsts-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('memory-media', 'memory-media', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('cities-images', 'cities-images', false)
on conflict (id) do nothing;

update storage.buckets
set public = false
where id = 'cities-images';

drop policy if exists "shared_members_read_storage" on storage.objects;
create policy "shared_members_read_storage"
on storage.objects
for select
using (
  bucket_id in ('firsts-images', 'memory-media', 'cities-images')
  and public.is_shared_member()
);

drop policy if exists "shared_members_insert_storage" on storage.objects;
create policy "shared_members_insert_storage"
on storage.objects
for insert
with check (
  bucket_id in ('firsts-images', 'memory-media', 'cities-images')
  and public.is_shared_member()
);

drop policy if exists "shared_members_update_storage" on storage.objects;
create policy "shared_members_update_storage"
on storage.objects
for update
using (
  bucket_id in ('firsts-images', 'memory-media', 'cities-images')
  and public.is_shared_member()
)
with check (
  bucket_id in ('firsts-images', 'memory-media', 'cities-images')
  and public.is_shared_member()
);

drop policy if exists "shared_members_delete_storage" on storage.objects;
create policy "shared_members_delete_storage"
on storage.objects
for delete
using (
  bucket_id in ('firsts-images', 'memory-media', 'cities-images')
  and public.is_shared_member()
);
