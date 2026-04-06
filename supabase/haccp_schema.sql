-- ─────────────────────────────────────────────────────────────
-- MasalShift — HACCP Schema
-- Supabase Dashboard > SQL Editor'da çalıştır
-- ─────────────────────────────────────────────────────────────

-- 6. HACCP ALANLARI (Mutfak, Depo, Buzdolabı 1, vs.)
create table public.haccp_areas (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  icon       text not null default '📍',
  created_at timestamptz default now()
);

alter table public.haccp_areas enable row level security;
create policy "Herkes haccp alanlarını yönetebilir"
  on haccp_areas for all using (auth.role() = 'authenticated');


-- 7. HACCP ŞABLONLARI (checklist türleri)
create table public.haccp_templates (
  id          uuid primary key default gen_random_uuid(),
  area_id     uuid references public.haccp_areas on delete set null,
  title       text not null,
  description text,
  list_type   text not null default 'custom'
              check (list_type in ('fridge','freezer','cleaning','expiry','custom')),
  frequency   text not null default 'daily'
              check (frequency in ('daily','weekly')),
  is_active   boolean not null default true,
  created_at  timestamptz default now()
);

alter table public.haccp_templates enable row level security;
create policy "Herkes haccp şablonlarını yönetebilir"
  on haccp_templates for all using (auth.role() = 'authenticated');


-- 8. HACCP ŞABLON ALANLARI (checkbox, sayı, metin)
create table public.haccp_template_fields (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid references public.haccp_templates on delete cascade,
  label       text not null,
  field_type  text not null check (field_type in ('checkbox','number','text')),
  required    boolean not null default true,
  min_value   numeric,
  max_value   numeric,
  unit        text,
  sort_order  int not null default 0,
  created_at  timestamptz default now()
);

alter table public.haccp_template_fields enable row level security;
create policy "Herkes haccp şablon alanlarını yönetebilir"
  on haccp_template_fields for all using (auth.role() = 'authenticated');


-- 9. HACCP GÖNDERİMLERİ (doldurulmuş kontroller)
create table public.haccp_submissions (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid references public.haccp_templates on delete cascade,
  submitted_by uuid references public.profiles on delete set null,
  submitted_at timestamptz default now(),
  date         date not null default current_date,
  status       text not null default 'ok'
               check (status in ('ok','warning','danger')),
  note         text
);

alter table public.haccp_submissions enable row level security;
create policy "Herkes haccp gönderimlerini yönetebilir"
  on haccp_submissions for all using (auth.role() = 'authenticated');


-- 10. HACCP GÖNDERİM GİRİŞLERİ (her alanın cevabı)
create table public.haccp_submission_entries (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid references public.haccp_submissions on delete cascade,
  field_id      uuid references public.haccp_template_fields on delete cascade,
  value_text    text,
  value_number  numeric,
  value_bool    boolean,
  is_flagged    boolean not null default false
);

alter table public.haccp_submission_entries enable row level security;
create policy "Herkes haccp girişlerini yönetebilir"
  on haccp_submission_entries for all using (auth.role() = 'authenticated');
