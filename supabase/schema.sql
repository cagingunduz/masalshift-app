-- ─────────────────────────────────────────────────────────────
-- MasalShift — Supabase Schema
-- Supabase Dashboard > SQL Editor'da çalıştır
-- ─────────────────────────────────────────────────────────────

-- 1. PROFİLLER (auth.users'ı genişletir)
create table public.profiles (
  id       uuid references auth.users on delete cascade primary key,
  name     text not null,
  role     text not null default 'staff' check (role in ('admin', 'staff')),
  initials text not null default '',
  color    text not null default '#38BDF8',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Herkes profilleri okuyabilir"
  on profiles for select using (auth.role() = 'authenticated');

create policy "Herkes profil ekleyebilir"
  on profiles for insert with check (auth.role() = 'authenticated');

create policy "Kullanıcı kendi profilini güncelleyebilir"
  on profiles for update using (auth.role() = 'authenticated');


-- 2. VARDİYALAR
create table public.shifts (
  id         uuid primary key default gen_random_uuid(),
  week_start date not null,
  day_index  int  not null check (day_index between 0 and 6),
  start_time text not null,
  end_time   text not null,
  created_at timestamptz default now()
);

alter table public.shifts enable row level security;

create policy "Herkes vardiyaları okuyabilir"
  on shifts for select using (auth.role() = 'authenticated');

create policy "Herkes vardiya yönetebilir"
  on shifts for all using (auth.role() = 'authenticated');


-- 3. VARDİYA ATAMALARI (çoka-çok)
create table public.shift_assignments (
  shift_id uuid references public.shifts   on delete cascade,
  staff_id uuid references public.profiles on delete cascade,
  primary key (shift_id, staff_id)
);

alter table public.shift_assignments enable row level security;

create policy "Herkes atamaları yönetebilir"
  on shift_assignments for all using (auth.role() = 'authenticated');


-- 4. MÜSAİTLİK
create table public.availability (
  id         uuid primary key default gen_random_uuid(),
  staff_id   uuid references public.profiles on delete cascade,
  week_start date not null,
  day_index  int  not null check (day_index between 0 and 6),
  type       text not null check (type in ('allday', 'partial')),
  reason     text,
  note       text,
  unique (staff_id, week_start, day_index)
);

alter table public.availability enable row level security;

create policy "Herkes müsaitlik okuyabilir"
  on availability for select using (auth.role() = 'authenticated');

create policy "Herkes müsaitlik yönetebilir"
  on availability for all using (auth.role() = 'authenticated');


-- 5. MÜSAİTLİK BLOKLARI (saat aralıkları)
create table public.availability_blocks (
  id              uuid primary key default gen_random_uuid(),
  availability_id uuid references public.availability on delete cascade,
  start_time      text not null,
  end_time        text not null,
  reason          text,
  note            text
);

alter table public.availability_blocks enable row level security;

create policy "Herkes blokları yönetebilir"
  on availability_blocks for all using (auth.role() = 'authenticated');


-- ─────────────────────────────────────────────────────────────
-- KURULUM SONRASI:
-- 1. Authentication > Providers > Email > "Confirm email" → KAPAT
-- 2. İlk admin hesabını Authentication > Users'dan manuel oluştur
-- 3. profiles tablosuna o kullanıcının id'siyle manuel satır ekle:
--    INSERT INTO profiles (id, name, role, initials, color)
--    VALUES ('<user-uuid>', 'Ad Soyad', 'admin', 'AS', '#B4A018');
-- ─────────────────────────────────────────────────────────────
