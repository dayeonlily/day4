-- Supabase SQL Editor 에서 실행: 회원가입 시 닉네임 프로필 자동 생성
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "본인 프로필 조회" on public.profiles
  for select using (auth.uid() = id);
create policy "본인 프로필 수정" on public.profiles
  for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, new.raw_user_meta_data ->> 'nickname');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------- 방명록 (읽기: 누구나 / 쓰기·삭제: 로그인한 본인) ----------
create table if not exists public.guestbook (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nickname text not null default '',
  message text not null check (char_length(message) between 1 and 200),
  created_at timestamptz not null default now()
);

alter table public.guestbook enable row level security;

create policy "방명록 누구나 조회" on public.guestbook
  for select using (true);
create policy "방명록 본인만 작성" on public.guestbook
  for insert to authenticated with check (auth.uid() = user_id);
create policy "방명록 본인만 삭제" on public.guestbook
  for delete to authenticated using (auth.uid() = user_id);

-- 닉네임은 클라이언트 값을 믿지 않고 가입 시 저장된 값으로 서버에서 채움
create or replace function public.guestbook_set_nickname()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  select coalesce(nullif(p.nickname, ''), split_part(u.email, '@', 1))
    into new.nickname
    from auth.users u
    left join public.profiles p on p.id = u.id
   where u.id = new.user_id;
  return new;
end;
$$;

drop trigger if exists guestbook_nickname on public.guestbook;
create trigger guestbook_nickname
  before insert on public.guestbook
  for each row execute function public.guestbook_set_nickname();
