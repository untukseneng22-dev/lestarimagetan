-- 1) Hapus alur pendaftaran via RT
drop table if exists public.registration_requests;

-- 2) Hapus akun demo RT (Hendra Wijaya)
delete from public.user_roles where user_id = 'a0000000-0000-4000-8000-000000000004';
update public.announcements set created_by = null where created_by = 'a0000000-0000-4000-8000-000000000004';
delete from public.profiles where id = 'a0000000-0000-4000-8000-000000000004';
delete from auth.identities where user_id = 'a0000000-0000-4000-8000-000000000004';
delete from auth.users where id = 'a0000000-0000-4000-8000-000000000004';

-- 3) Hapus nilai 'rt' dari enum app_role.
-- has_role bergantung pada enum lama; menjatuhkannya (cascade) ikut menghapus
-- policy yang memakainya, lalu semuanya dibuat ulang identik di langkah 4.
drop function public.has_role(uuid, app_role) cascade;

alter type public.app_role rename to app_role_old;
create type public.app_role as enum ('admin', 'tim', 'warga');
alter table public.user_roles
  alter column role type public.app_role using role::text::public.app_role;
drop type public.app_role_old;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select _user_id = auth.uid() and exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

revoke execute on function public.has_role(uuid, app_role) from anon, public;
grant execute on function public.has_role(uuid, app_role) to authenticated;

-- 4) Buat ulang semua policy yang memakai has_role (definisi identik dengan sebelumnya)
create policy "admins manage announcements" on public.announcements for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

create policy "admins respond complaints" on public.complaints for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

create policy "residents and admins read complaints" on public.complaints for select to authenticated
  using ((resident_id = auth.uid()) or public.has_role(auth.uid(), 'admin'::app_role));

create policy "admins read notification logs" on public.notification_logs for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role));

create policy "residents read and request pickups" on public.pickup_tasks for select to authenticated
  using ((resident_id = auth.uid()) or public.has_role(auth.uid(), 'tim'::app_role) or public.has_role(auth.uid(), 'admin'::app_role));

create policy "residents request pickup" on public.pickup_tasks for insert to authenticated
  with check ((resident_id = auth.uid()) or public.has_role(auth.uid(), 'admin'::app_role));

create policy "tim and admin update pickups" on public.pickup_tasks for update to authenticated
  using (public.has_role(auth.uid(), 'tim'::app_role) or public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'tim'::app_role) or public.has_role(auth.uid(), 'admin'::app_role));

create policy "admins insert price history" on public.price_history for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'::app_role));

create policy "admins manage profiles" on public.profiles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

create policy "residents read own transactions" on public.transactions for select to authenticated
  using ((resident_id = auth.uid()) or public.has_role(auth.uid(), 'tim'::app_role) or public.has_role(auth.uid(), 'admin'::app_role));

create policy "tim and admin record transactions" on public.transactions for insert to authenticated
  with check (public.has_role(auth.uid(), 'tim'::app_role) or public.has_role(auth.uid(), 'admin'::app_role));

create policy "read items of visible transactions" on public.transaction_items for select to authenticated
  using (exists (
    select 1 from public.transactions t
    where t.id = transaction_items.transaction_id
      and (t.resident_id = auth.uid() or public.has_role(auth.uid(), 'tim'::app_role) or public.has_role(auth.uid(), 'admin'::app_role))
  ));

create policy "tim and admin insert items" on public.transaction_items for insert to authenticated
  with check (public.has_role(auth.uid(), 'tim'::app_role) or public.has_role(auth.uid(), 'admin'::app_role));

create policy "users can read own roles, admins read all" on public.user_roles for select to authenticated
  using ((auth.uid() = user_id) or public.has_role(auth.uid(), 'admin'::app_role));

create policy "admins manage categories" on public.waste_categories for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

create policy "admins process withdrawals" on public.withdrawals for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

create policy "residents read own withdrawals" on public.withdrawals for select to authenticated
  using ((resident_id = auth.uid()) or public.has_role(auth.uid(), 'admin'::app_role));

create policy "warga dan admin baca foto aduan" on storage.objects for select to authenticated
  using (
    bucket_id = 'aduan'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.has_role(auth.uid(), 'admin'::app_role))
  );

-- 5) Login berbasis username: perbarui kata sandi & email internal akun utama
update auth.users
set encrypted_password = crypt('magetanngangeni', gen_salt('bf')), updated_at = now()
where email in ('admin@banksampah.id', 'tim@banksampah.id', 'budi@banksampah.id');

update auth.users set email = 'banksampah@banksampah.id', updated_at = now()
where email = 'tim@banksampah.id';
update auth.identities i
set identity_data = jsonb_set(i.identity_data, '{email}', to_jsonb('banksampah@banksampah.id'::text)), updated_at = now()
from auth.users u
where i.user_id = u.id and u.email = 'banksampah@banksampah.id';

update auth.users set email = 'budisantoso@banksampah.id', updated_at = now()
where email = 'budi@banksampah.id';
update auth.identities i
set identity_data = jsonb_set(i.identity_data, '{email}', to_jsonb('budisantoso@banksampah.id'::text)), updated_at = now()
from auth.users u
where i.user_id = u.id and u.email = 'budisantoso@banksampah.id';