-- Protectyourself Journal article management
-- Run this once in the existing Supabase project SQL Editor.
-- Uses the existing public.is_protectyourself_admin() authorization function.
create table if not exists public.journal_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null default 'Journal',
  read_time_minutes integer not null default 4 check (read_time_minutes between 1 and 60),
  excerpt text not null default '' check (char_length(excerpt) <= 400),
  content text not null default '',
  is_published boolean not null default false,
  is_featured boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists journal_articles_public_listing_idx
  on public.journal_articles (is_published, is_featured, published_at desc);
alter table public.journal_articles enable row level security;
drop policy if exists "public read published journal articles" on public.journal_articles;
drop policy if exists "authenticated read journal articles" on public.journal_articles;
create policy "public read published journal articles" on public.journal_articles
  for select to anon using (is_published = true);
create policy "authenticated read journal articles" on public.journal_articles
  for select to authenticated using (is_published = true or public.is_protectyourself_admin());
drop policy if exists "admins manage journal articles" on public.journal_articles;
create policy "admins manage journal articles" on public.journal_articles
  for all to authenticated using (public.is_protectyourself_admin())
  with check (public.is_protectyourself_admin());
grant select on public.journal_articles to anon, authenticated;
grant insert, update, delete on public.journal_articles to authenticated;

-- Seed the three existing homepage Journal entries so they become editable in Admin.
-- The article content below is starter editorial copy and can be edited before publication.
insert into public.journal_articles (title,slug,category,read_time_minutes,excerpt,content,is_published,is_featured,published_at)
values
('How to build a personal daily ritual','how-to-build-a-personal-daily-ritual','Everyday Practice',4,'Start small, stay consistent, and make the routine your own.',
$$A meaningful daily ritual does not have to be complicated. A few quiet minutes of prayer, reflection, or mindful breathing can create a sense of purpose before the demands of the day begin.

In the Sanātana Dharma tradition, daily spiritual practice can take many forms, including mantra-japa, dhyāna (meditation), pūjā (worship), svādhyāya (self-study), and acts of service. The purpose is not simply to complete a routine, but to cultivate awareness, discipline, gratitude, and a deeper connection with one's values.

## Begin with a simple intention
Before choosing a practice, ask yourself what you hope to cultivate. It might be patience, clarity, devotion, self-discipline, or gratitude. A clear intention helps your ritual become personally meaningful rather than another task on your schedule.

## Create a peaceful space
Choose a clean, quiet corner where you can sit comfortably. You may keep a small picture or symbol that inspires you, a book for daily reading, or a place for your regular prayer. You do not need elaborate arrangements or expensive objects. Consistency and sincerity matter more than appearance.

## Choose a practice you can sustain
Start with five to ten minutes. Depending on your tradition and personal inclination, you might recite a mantra or offer a prayer, sit quietly and observe your breathing, read a short passage from a traditional text, reflect on something for which you are grateful, or set an intention to act with kindness and integrity. Learn specific traditional methods from reliable sources or qualified teachers.

## Let consistency grow naturally
It is often easier to maintain a small practice than to begin with an ambitious routine. Attach your ritual to an existing habit, such as waking up or preparing for the day. If you miss a session, simply return to it without turning the lapse into a reason to give up.

## Carry your practice into everyday life
Spirituality need not end when prayer or meditation ends. Patience in conversation, honesty in work, care for others, and responsible decisions can reflect the values you cultivate in your daily practice.

A daily ritual becomes valuable not because it is elaborate, but because it helps you return, again and again, to what matters.$$, true, true, now()),
('Choosing a meaningful gift','choosing-a-meaningful-gift','Thoughtful Giving',3,'Thoughtful questions to ask before choosing something for another person.',
$$A thoughtful gift can express care in a way that lasts beyond the moment. The most meaningful gifts often reflect the recipient's interests, values, traditions, or everyday needs.

Spiritual and devotional gifts can be especially personal. A book, mālā, devotional artwork, or item for a prayer space may become part of someone's daily routine. The key is to choose with consideration rather than assumption.

## Think about the person first
Consider the recipient's preferences. Do they enjoy reading, maintain a regular prayer or meditation practice, appreciate traditional craftsmanship, or prefer practical objects? A gift becomes more meaningful when it fits the person's life rather than simply reflecting the giver's taste.

## Consider its purpose
A mālā may be useful to someone who practises mantra-japa. A book may support someone exploring philosophy or traditional literature. A small decorative piece may help someone create a personal space for reflection. If you are unsure, choose something versatile or ask a gentle question about what the recipient would appreciate.

## Respect traditions and personal beliefs
Religious symbols and devotional objects can carry deep significance. Their meaning and appropriate use may vary across families, communities, and traditions. Learn about an item's significance and avoid assuming that every person follows the same practices.

## Look beyond appearance
Consider materials, workmanship, comfort, durability, and ease of care. Read product descriptions carefully and ask questions when important details are missing. There is no need for elaborate wrapping or an expensive purchase. Thoughtfulness is expressed through attention, not extravagance.

A meaningful gift does not have to be grand. It should communicate that the person receiving it has been considered with care.$$, true, true, now()),
('What to look for in product descriptions','what-to-look-for-in-product-descriptions','Care & Clarity',5,'Why clear materials, sizing, care and delivery details matter.',
$$When purchasing devotional accessories, spiritual essentials, or traditional handmade objects online, the product description is often your first opportunity to understand what you are buying. A beautiful photograph can attract attention, but a good purchasing decision requires more than appearance.

## Check the materials
Look for specific information about what the product is made from. Is a mālā described as wooden, made from seeds, or crafted from another material? If the description uses vague phrases such as “premium quality” without explaining the material, ask the seller for clarification. Do not assume a material is authentic simply because it appears in a product name or photograph.

## Understand the dimensions
Photographs can make small objects appear larger or conceal important proportions. Check the listed length, width, diameter, weight, or bead count where relevant. Measurements can make a significant difference when an item is worn, carried, displayed, or placed in a prayer space.

## Look for workmanship and care details
A useful description explains how an item is made or finished when that information is available. Look for cleaning, storage, and maintenance instructions. Handcrafted items may differ slightly, but important limitations should be disclosed clearly.

## Review delivery and return terms
Before placing an order, review dispatch and delivery timelines, shipping charges, return or exchange terms, and customer support information. Make sure you understand the total cost before checkout.

## Be cautious with unsupported claims
Claims about rarity, origin, special powers, health benefits, or guaranteed spiritual outcomes deserve careful scrutiny. A product description should distinguish verifiable facts from traditional beliefs and promotional language. No accessory should be presented as a substitute for professional medical care or as a guarantee of a particular life outcome.

A well-written product description helps customers understand what they can reasonably expect and make decisions with confidence. The more transparent the details, the easier it is to choose with care.$$, true, true, now())
on conflict (slug) do nothing;
