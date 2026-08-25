create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'tim', 'rt', 'warga');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "users can read own roles, admins read all"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  address text,
  rt text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "authenticated can read profiles"
  on public.profiles for select to authenticated using (true);
create policy "users update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);
create policy "admins manage profiles"
  on public.profiles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.registration_requests (
  id uuid primary key default gen_random_uuid(),
  rt_user_id uuid not null references auth.users(id),
  full_name text not null,
  address text not null,
  whatsapp_number text not null,
  rt text,
  status text not null default 'menunggu' check (status in ('menunggu','disetujui','ditolak')),
  reason text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  account_created boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.registration_requests to authenticated;
grant all on public.registration_requests to service_role;
alter table public.registration_requests enable row level security;

create policy "rt can submit requests"
  on public.registration_requests for insert to authenticated
  with check (auth.uid() = rt_user_id and public.has_role(auth.uid(), 'rt'));
create policy "rt can read own requests"
  on public.registration_requests for select to authenticated
  using (auth.uid() = rt_user_id or public.has_role(auth.uid(), 'admin'));
create policy "admins decide requests"
  on public.registration_requests for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.waste_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit text not null default 'kg',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.waste_categories to authenticated;
grant all on public.waste_categories to service_role;
alter table public.waste_categories enable row level security;

create policy "authenticated read categories"
  on public.waste_categories for select to authenticated using (true);
create policy "admins manage categories"
  on public.waste_categories for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.price_history (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.waste_categories(id) on delete cascade,
  price_per_kg numeric(12,2) not null,
  effective_at timestamptz not null default now(),
  changed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
grant select, insert on public.price_history to authenticated;
grant all on public.price_history to service_role;
alter table public.price_history enable row level security;

create policy "authenticated read price history"
  on public.price_history for select to authenticated using (true);
create policy "admins insert price history"
  on public.price_history for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references auth.users(id),
  recorded_by uuid references auth.users(id),
  deposit_date date not null default current_date,
  total_weight numeric(10,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert on public.transactions to authenticated;
grant all on public.transactions to service_role;
alter table public.transactions enable row level security;

create policy "residents read own transactions"
  on public.transactions for select to authenticated
  using (resident_id = auth.uid() or public.has_role(auth.uid(), 'tim') or public.has_role(auth.uid(), 'admin'));
create policy "tim and admin record transactions"
  on public.transactions for insert to authenticated
  with check (public.has_role(auth.uid(), 'tim') or public.has_role(auth.uid(), 'admin'));

create table public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  category_id uuid references public.waste_categories(id),
  category_name text not null,
  weight_kg numeric(10,2) not null,
  price_per_kg numeric(12,2) not null,
  subtotal numeric(14,2) not null
);
grant select, insert on public.transaction_items to authenticated;
grant all on public.transaction_items to service_role;
alter table public.transaction_items enable row level security;

create policy "read items of visible transactions"
  on public.transaction_items for select to authenticated
  using (exists (
    select 1 from public.transactions t
    where t.id = transaction_id
      and (t.resident_id = auth.uid() or public.has_role(auth.uid(), 'tim') or public.has_role(auth.uid(), 'admin'))
  ));
create policy "tim and admin insert items"
  on public.transaction_items for insert to authenticated
  with check (public.has_role(auth.uid(), 'tim') or public.has_role(auth.uid(), 'admin'));

create table public.pickup_tasks (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid references auth.users(id),
  address text not null,
  scheduled_date date not null default current_date,
  status text not null default 'menunggu' check (status in ('menunggu','dijadwalkan','dalam_perjalanan','selesai','dibatalkan')),
  assigned_to uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.pickup_tasks to authenticated;
grant all on public.pickup_tasks to service_role;
alter table public.pickup_tasks enable row level security;

create policy "residents read and request pickups"
  on public.pickup_tasks for select to authenticated
  using (resident_id = auth.uid() or public.has_role(auth.uid(), 'tim') or public.has_role(auth.uid(), 'admin'));
create policy "residents request pickup"
  on public.pickup_tasks for insert to authenticated
  with check (resident_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "tim and admin update pickups"
  on public.pickup_tasks for update to authenticated
  using (public.has_role(auth.uid(), 'tim') or public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'tim') or public.has_role(auth.uid(), 'admin'));

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references auth.users(id),
  title text not null,
  description text not null,
  photo_url text,
  status text not null default 'baru' check (status in ('baru','diproses','selesai')),
  response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.complaints to authenticated;
grant all on public.complaints to service_role;
alter table public.complaints enable row level security;

create policy "residents and admins read complaints"
  on public.complaints for select to authenticated
  using (resident_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "residents create complaints"
  on public.complaints for insert to authenticated
  with check (resident_id = auth.uid());
create policy "admins respond complaints"
  on public.complaints for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid references auth.users(id),
  published_at timestamptz not null default now()
);
grant select, insert, delete on public.announcements to authenticated;
grant all on public.announcements to service_role;
alter table public.announcements enable row level security;

create policy "authenticated read announcements"
  on public.announcements for select to authenticated using (true);
create policy "admins manage announcements"
  on public.announcements for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references auth.users(id),
  amount numeric(14,2) not null,
  status text not null default 'menunggu' check (status in ('menunggu','disetujui','ditolak','dicairkan')),
  note text,
  processed_by uuid references auth.users(id),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.withdrawals to authenticated;
grant all on public.withdrawals to service_role;
alter table public.withdrawals enable row level security;

create policy "residents read own withdrawals"
  on public.withdrawals for select to authenticated
  using (resident_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "residents request withdrawal"
  on public.withdrawals for insert to authenticated
  with check (resident_id = auth.uid());
create policy "admins process withdrawals"
  on public.withdrawals for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  recipient_name text,
  recipient_phone text not null,
  message text not null,
  provider text not null default 'mock',
  status text not null default 'tercatat' check (status in ('terkirim','tercatat','gagal')),
  created_at timestamptz not null default now()
);
grant select, insert on public.notification_logs to authenticated;
grant all on public.notification_logs to service_role;
alter table public.notification_logs enable row level security;

create policy "admins read notification logs"
  on public.notification_logs for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "authenticated insert notification logs"
  on public.notification_logs for insert to authenticated
  with check (true);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, recovery_token, email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000001','authenticated','authenticated','admin@banksampah.id', crypt('password123', gen_salt('bf')), now(), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Admin Bank Sampah"}', false, now(), now()),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000002','authenticated','authenticated','tim@banksampah.id', crypt('password123', gen_salt('bf')), now(), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Rudi Hartono"}', false, now(), now()),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000003','authenticated','authenticated','tim2@banksampah.id', crypt('password123', gen_salt('bf')), now(), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Samsul Arifin"}', false, now(), now()),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000004','authenticated','authenticated','rt@banksampah.id', crypt('password123', gen_salt('bf')), now(), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Hendra Wijaya"}', false, now(), now()),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000011','authenticated','authenticated','budi@banksampah.id', crypt('password123', gen_salt('bf')), now(), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Budi Santoso"}', false, now(), now()),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000012','authenticated','authenticated','sari@banksampah.id', crypt('password123', gen_salt('bf')), now(), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Sari Rahayu"}', false, now(), now()),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000013','authenticated','authenticated','joko@banksampah.id', crypt('password123', gen_salt('bf')), now(), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Joko Prasetyo"}', false, now(), now()),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000014','authenticated','authenticated','dewi@banksampah.id', crypt('password123', gen_salt('bf')), now(), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Dewi Lestari"}', false, now(), now()),
  ('00000000-0000-0000-0000-000000000000','a0000000-0000-4000-8000-000000000015','authenticated','authenticated','agus@banksampah.id', crypt('password123', gen_salt('bf')), now(), now(), '', '', '', '', '{"provider":"email","providers":["email"]}', '{"full_name":"Agus Wibowo"}', false, now(), now());

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email', now(), now(), now()
from auth.users u
where u.email like '%@banksampah.id';

insert into public.profiles (id, full_name, phone, address, rt) values
  ('a0000000-0000-4000-8000-000000000001','Admin Bank Sampah','081200000001','Jl. Merdeka No. 1','-'),
  ('a0000000-0000-4000-8000-000000000002','Rudi Hartono','081200000002','Jl. Cempaka No. 3','RT 05'),
  ('a0000000-0000-4000-8000-000000000003','Samsul Arifin','081200000003','Jl. Kenanga No. 7','RT 06'),
  ('a0000000-0000-4000-8000-000000000004','Hendra Wijaya','081200000004','Jl. Anggrek No. 2','RT 05'),
  ('a0000000-0000-4000-8000-000000000011','Budi Santoso','081234567801','Jl. Melati No. 12','RT 05'),
  ('a0000000-0000-4000-8000-000000000012','Sari Rahayu','081234567802','Jl. Melati No. 15','RT 05'),
  ('a0000000-0000-4000-8000-000000000013','Joko Prasetyo','081234567803','Jl. Flamboyan No. 4','RT 05'),
  ('a0000000-0000-4000-8000-000000000014','Dewi Lestari','081234567804','Jl. Flamboyan No. 9','RT 06'),
  ('a0000000-0000-4000-8000-000000000015','Agus Wibowo','081234567805','Jl. Cendana No. 21','RT 06');

insert into public.user_roles (user_id, role) values
  ('a0000000-0000-4000-8000-000000000001','admin'),
  ('a0000000-0000-4000-8000-000000000002','tim'),
  ('a0000000-0000-4000-8000-000000000003','tim'),
  ('a0000000-0000-4000-8000-000000000004','rt'),
  ('a0000000-0000-4000-8000-000000000011','warga'),
  ('a0000000-0000-4000-8000-000000000012','warga'),
  ('a0000000-0000-4000-8000-000000000013','warga'),
  ('a0000000-0000-4000-8000-000000000014','warga'),
  ('a0000000-0000-4000-8000-000000000015','warga');

insert into public.waste_categories (id, name, unit) values
  ('b0000000-0000-4000-8000-000000000001','Plastik PET','kg'),
  ('b0000000-0000-4000-8000-000000000002','Plastik Campuran','kg'),
  ('b0000000-0000-4000-8000-000000000003','Kertas Koran','kg'),
  ('b0000000-0000-4000-8000-000000000004','Kardus','kg'),
  ('b0000000-0000-4000-8000-000000000005','Botol Kaca','kg'),
  ('b0000000-0000-4000-8000-000000000006','Kaleng Aluminium','kg'),
  ('b0000000-0000-4000-8000-000000000007','Besi Tua','kg'),
  ('b0000000-0000-4000-8000-000000000008','Minyak Jelantah','liter');

insert into public.price_history (category_id, price_per_kg, effective_at, changed_by) values
  ('b0000000-0000-4000-8000-000000000001', 4500, '2026-06-01 08:00:00+07', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000002', 2000, '2026-06-01 08:00:00+07', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000003', 2500, '2026-06-01 08:00:00+07', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000004', 1800, '2026-06-01 08:00:00+07', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000005', 1500, '2026-06-01 08:00:00+07', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000006', 12000, '2026-06-01 08:00:00+07', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000007', 3500, '2026-06-01 08:00:00+07', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000008', 8000, '2026-06-01 08:00:00+07', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000001', 5000, '2026-08-01 09:30:00+07', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000003', 2750, '2026-08-01 09:30:00+07', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000004', 2000, '2026-08-01 09:30:00+07', 'a0000000-0000-4000-8000-000000000001');

insert into public.transactions (id, resident_id, recorded_by, deposit_date, total_weight, total_amount, created_at) values
  ('d0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000011','a0000000-0000-4000-8000-000000000002','2026-07-20',10.0,28800,'2026-07-20 09:15:00+07'),
  ('d0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000012','a0000000-0000-4000-8000-000000000002','2026-07-05',8.0,20000,'2026-07-05 10:00:00+07'),
  ('d0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000011','a0000000-0000-4000-8000-000000000002','2026-08-10',8.0,28750,'2026-08-10 09:40:00+07'),
  ('d0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000012','a0000000-0000-4000-8000-000000000003','2026-08-12',14.0,28000,'2026-08-12 11:05:00+07'),
  ('d0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000013','a0000000-0000-4000-8000-000000000002','2026-08-15',6.5,35500,'2026-08-15 08:55:00+07'),
  ('d0000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000014','a0000000-0000-4000-8000-000000000003','2026-08-18',2.0,16000,'2026-08-18 13:20:00+07'),
  ('d0000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000015','a0000000-0000-4000-8000-000000000002','2026-08-22',10.0,22000,'2026-08-22 09:10:00+07'),
  ('d0000000-0000-4000-8000-000000000008','a0000000-0000-4000-8000-000000000011','a0000000-0000-4000-8000-000000000002','2026-08-24',5.0,10000,'2026-08-24 16:45:00+07');

insert into public.transaction_items (transaction_id, category_id, category_name, weight_kg, price_per_kg, subtotal) values
  ('d0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','Plastik PET',4.0,4500,18000),
  ('d0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000004','Kardus',6.0,1800,10800),
  ('d0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000003','Kertas Koran',8.0,2500,20000),
  ('d0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000001','Plastik PET',3.0,5000,15000),
  ('d0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000003','Kertas Koran',5.0,2750,13750),
  ('d0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000004','Kardus',10.0,2000,20000),
  ('d0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000002','Plastik Campuran',4.0,2000,8000),
  ('d0000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000006','Kaleng Aluminium',1.5,12000,18000),
  ('d0000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000007','Besi Tua',5.0,3500,17500),
  ('d0000000-0000-4000-8000-000000000006','b0000000-0000-4000-8000-000000000008','Minyak Jelantah',2.0,8000,16000),
  ('d0000000-0000-4000-8000-000000000007','b0000000-0000-4000-8000-000000000001','Plastik PET',2.0,5000,10000),
  ('d0000000-0000-4000-8000-000000000007','b0000000-0000-4000-8000-000000000005','Botol Kaca',8.0,1500,12000),
  ('d0000000-0000-4000-8000-000000000008','b0000000-0000-4000-8000-000000000004','Kardus',5.0,2000,10000);

insert into public.pickup_tasks (resident_id, address, scheduled_date, status, assigned_to, notes, created_at, updated_at) values
  ('a0000000-0000-4000-8000-000000000011','Jl. Melati No. 12, RT 05','2026-08-25','menunggu',null,'Sekitar 15 kg kardus dan plastik','2026-08-24 19:00:00+07','2026-08-24 19:00:00+07'),
  ('a0000000-0000-4000-8000-000000000012','Jl. Melati No. 15, RT 05','2026-08-26','dijadwalkan','a0000000-0000-4000-8000-000000000002','Plastik PET 2 karung','2026-08-23 10:00:00+07','2026-08-24 08:00:00+07'),
  ('a0000000-0000-4000-8000-000000000014','Jl. Flamboyan No. 9, RT 06','2026-08-25','dalam_perjalanan','a0000000-0000-4000-8000-000000000002','Minyak jelantah 2 jerigen','2026-08-24 09:00:00+07','2026-08-25 08:30:00+07'),
  ('a0000000-0000-4000-8000-000000000013','Jl. Flamboyan No. 4, RT 05','2026-08-23','selesai','a0000000-0000-4000-8000-000000000003','Besi tua dan kaleng','2026-08-21 14:00:00+07','2026-08-23 11:00:00+07');

insert into public.complaints (resident_id, title, description, photo_url, status, response, created_at, updated_at) values
  ('a0000000-0000-4000-8000-000000000011','Jadwal penjemputan terlambat','Penjemputan yang dijadwalkan kemarin baru datang hari ini. Mohon jadwal lebih ditepati.',null,'diproses','Mohon maaf atas keterlambatan. Armada sedang ditambah dan jadwal akan dievaluasi ulang.','2026-08-20 08:00:00+07','2026-08-21 09:00:00+07'),
  ('a0000000-0000-4000-8000-000000000012','Timbangan posko kurang akurat','Hasil timbangan di posko berbeda cukup jauh dengan timbangan rumah. Mohon dicek kalibrasinya.',null,'baru',null,'2026-08-24 15:30:00+07','2026-08-24 15:30:00+07'),
  ('a0000000-0000-4000-8000-000000000013','Apresiasi petugas lapangan','Petugas datang tepat waktu dan sangat membantu saat penimbangan. Terima kasih!',null,'selesai','Terima kasih atas apresiasinya, akan kami teruskan ke tim lapangan.','2026-08-15 10:00:00+07','2026-08-16 09:00:00+07');

insert into public.announcements (title, body, created_by, published_at) values
  ('Jadwal Penjemputan Minggu Ini','Penjemputan sampah anorganik dilakukan setiap Selasa dan Jumat pukul 08.00-12.00. Silakan ajukan penjemputan melalui aplikasi maksimal H-1.','a0000000-0000-4000-8000-000000000001','2026-08-24 08:00:00+07'),
  ('Harga Plastik PET Naik','Mulai 1 Agustus 2026, harga Plastik PET naik menjadi Rp5.000/kg, Kertas Koran Rp2.750/kg, dan Kardus Rp2.000/kg.','a0000000-0000-4000-8000-000000000001','2026-08-01 09:30:00+07'),
  ('Lomba Bank Sampah Antar-RT','Dalam rangka HUT Kemerdekaan, diadakan lomba setoran sampah antar-RT. RT dengan total timbangan terbanyak bulan ini mendapat hadiah Rp500.000.','a0000000-0000-4000-8000-000000000001','2026-08-10 10:00:00+07');

insert into public.withdrawals (resident_id, amount, status, note, processed_by, processed_at, created_at) values
  ('a0000000-0000-4000-8000-000000000011',25000,'disetujui','Disetujui, silakan ambil di posko.','a0000000-0000-4000-8000-000000000001','2026-08-19 10:00:00+07','2026-08-18 20:00:00+07'),
  ('a0000000-0000-4000-8000-000000000012',15000,'menunggu',null,null,null,'2026-08-24 18:00:00+07'),
  ('a0000000-0000-4000-8000-000000000013',10000,'dicairkan','Sudah dicairkan tunai di posko.','a0000000-0000-4000-8000-000000000001','2026-08-17 11:00:00+07','2026-08-16 19:30:00+07'),
  ('a0000000-0000-4000-8000-000000000014',20000,'ditolak','Saldo tidak mencukupi untuk nominal ini.','a0000000-0000-4000-8000-000000000001','2026-08-18 09:00:00+07','2026-08-17 21:00:00+07');

insert into public.registration_requests (rt_user_id, full_name, address, whatsapp_number, rt, status, reason, decided_by, decided_at, account_created, created_at) values
  ('a0000000-0000-4000-8000-000000000004','Ratna Sari','Jl. Melati No. 20','081234567810','RT 05','menunggu',null,null,null,false,'2026-08-24 09:00:00+07'),
  ('a0000000-0000-4000-8000-000000000004','Bambang Riyanto','Jl. Flamboyan No. 18','081234567811','RT 05','ditolak','Nomor WhatsApp tidak aktif dan tidak dapat dihubungi.','a0000000-0000-4000-8000-000000000001','2026-08-22 10:00:00+07',false,'2026-08-21 15:00:00+07'),
  ('a0000000-0000-4000-8000-000000000004','Lina Marlina','Jl. Melati No. 3','081234567812','RT 05','disetujui','Data lengkap dan terverifikasi.','a0000000-0000-4000-8000-000000000001','2026-08-23 11:00:00+07',false,'2026-08-22 08:30:00+07');

insert into public.notification_logs (event_type, recipient_name, recipient_phone, message, provider, status, created_at) values
  ('akun_baru','Budi Santoso','081234567801','Halo Budi Santoso! Akun Bank Sampah Anda telah dibuat. Login: budi@banksampah.id / password123. Tunjukkan QR di aplikasi saat menyetor sampah.','mock','tercatat','2026-08-01 08:00:00+07'),
  ('transaksi_setoran','Budi Santoso','081234567801','Setoran 24 Agu 2026 berhasil: Kardus 5 kg x Rp2.000 = Rp10.000. Total Rp10.000. Saldo Anda kini Rp42.550.','mock','tercatat','2026-08-24 16:45:00+07'),
  ('status_penjemputan','Dewi Lestari','081234567804','Status penjemputan Anda (25 Agu 2026) berubah menjadi: Dalam Perjalanan. Petugas: Rudi Hartono.','mock','tercatat','2026-08-25 08:30:00+07'),
  ('pengajuan_pencairan','Sari Rahayu','081234567802','Pengajuan pencairan saldo Rp15.000 telah kami terima dan sedang diproses admin.','mock','tercatat','2026-08-24 18:00:00+07'),
  ('status_aduan','Budi Santoso','081234567801','Aduan "Jadwal penjemputan terlambat" kini berstatus: Diproses. Tanggapan: Mohon maaf atas keterlambatan...','mock','tercatat','2026-08-21 09:00:00+07');