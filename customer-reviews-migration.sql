-- Protectyourself Foundation: customer reviews management
-- Run in Supabase Dashboard -> SQL Editor as project owner. Safe to re-run.
create table if not exists public.customer_reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (length(trim(customer_name)) between 1 and 120),
  title text check (title is null or length(title) <= 160),
  review_text text not null check (length(trim(review_text)) between 1 and 4000),
  rating smallint check (rating is null or rating between 1 and 5),
  status text not null default 'draft' check (status in ('draft','published')),
  photo_url text,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_reviews_public_order_idx on public.customer_reviews (status, created_at desc);
alter table public.customer_reviews enable row level security;
drop policy if exists "Public can read published customer reviews" on public.customer_reviews;
create policy "Public can read published customer reviews" on public.customer_reviews for select to anon, authenticated using (status = 'published' or public.is_protectyourself_admin());
drop policy if exists "Admins manage customer reviews" on public.customer_reviews;
create policy "Admins manage customer reviews" on public.customer_reviews for all to authenticated using (public.is_protectyourself_admin()) with check (public.is_protectyourself_admin());
grant select on public.customer_reviews to anon, authenticated;
grant insert, update, delete on public.customer_reviews to authenticated;

-- Public bucket is required so published photo URLs can be displayed on the public Services page.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('customer-review-photos', 'customer-review-photos', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];
drop policy if exists "Public can view customer review photos" on storage.objects;
create policy "Public can view customer review photos" on storage.objects for select to anon, authenticated using (bucket_id = 'customer-review-photos');
drop policy if exists "Admins upload customer review photos" on storage.objects;
create policy "Admins upload customer review photos" on storage.objects for insert to authenticated with check (bucket_id = 'customer-review-photos' and public.is_protectyourself_admin());
drop policy if exists "Admins update customer review photos" on storage.objects;
create policy "Admins update customer review photos" on storage.objects for update to authenticated using (bucket_id = 'customer-review-photos' and public.is_protectyourself_admin()) with check (bucket_id = 'customer-review-photos' and public.is_protectyourself_admin());
drop policy if exists "Admins delete customer review photos" on storage.objects;
create policy "Admins delete customer review photos" on storage.objects for delete to authenticated using (bucket_id = 'customer-review-photos' and public.is_protectyourself_admin());

-- Seed the currently displayed customer testimonial so it becomes editable in the Admin Panel.
insert into public.customer_reviews (customer_name, title, review_text, status, photo_url)
select 'A customer of Protectyourself Foundation', 'Reflections on a Personal Journey',
       'Before taking this service, my 2D echocardiography report showed a left ventricular ejection fraction (LVEF) of 20%. Approximately one year later, my new 2D echocardiography report showed an LVEF of 40–45%. I also observed that my blood pressure had reduced significantly during this period. I am sharing my experience to describe the changes I have observed in my life and heart-health reports.',
       'published', 'https://i.ibb.co/cXkthr98/9f07a234-7f14-4c7f-b55d-47106c1f48cb.png'
where not exists (select 1 from public.customer_reviews where title = 'Reflections on a Personal Journey' and customer_name = 'A customer of Protectyourself Foundation');
