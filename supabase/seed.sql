-- ============================================================================
--  Demo workspace: Cafe Kolektyw, Kazimierz, Krakow.
--  Same data the app ships with in demo mode, so switching to Supabase does not
--  change what you see on screen.
--
--  Run after both migrations, in the Supabase SQL editor or with
--  `supabase db reset`. Safe to run twice.
-- ============================================================================

-- ── Demo users ──────────────────────────────────────────────────────────────
-- Everything below resolves users by email, so this block is optional. If you
-- would rather create the three accounts from Authentication > Users in the
-- dashboard, do that first with these exact addresses and skip this insert.
-- The password here is a demo password. Change it before anyone real logs in.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'marta@cafekolektyw.pl',
   crypt('demo-password-123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Marta Zielinska"}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'jakub@cafekolektyw.pl',
   crypt('demo-password-123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Jakub Nowak"}', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000003',
   'authenticated', 'authenticated', 'ops@reviewreply.app',
   crypt('demo-password-123', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Nikola Krecisz"}', '', '', '', '')
on conflict (id) do nothing;

-- ── Profiles, tenant, members ───────────────────────────────────────────────

insert into profiles (id, user_id, full_name, email, avatar_initials)
values
  ('bbbbbbbb-0000-4000-8000-000000000001', (select id from auth.users where email = 'marta@cafekolektyw.pl'), 'Marta Zielinska', 'marta@cafekolektyw.pl', 'MZ'),
  ('bbbbbbbb-0000-4000-8000-000000000002', (select id from auth.users where email = 'jakub@cafekolektyw.pl'), 'Jakub Nowak', 'jakub@cafekolektyw.pl', 'JN'),
  ('bbbbbbbb-0000-4000-8000-000000000003', (select id from auth.users where email = 'ops@reviewreply.app'), 'Nikola Krecisz', 'ops@reviewreply.app', 'NK')
on conflict (user_id) do nothing;

insert into tenants (id, name, slug, plan)
values ('11111111-1111-4111-8111-111111111111', 'Cafe Kolektyw', 'cafe-kolektyw', 'growth')
on conflict (id) do nothing;

insert into tenant_members (tenant_id, user_id, role, job_title)
values
  ('11111111-1111-4111-8111-111111111111', (select id from auth.users where email = 'marta@cafekolektyw.pl'), 'tenant_admin', 'Owner'),
  ('11111111-1111-4111-8111-111111111111', (select id from auth.users where email = 'jakub@cafekolektyw.pl'), 'tenant_member', 'Floor manager'),
  ('11111111-1111-4111-8111-111111111111', (select id from auth.users where email = 'ops@reviewreply.app'), 'platform_admin', 'Platform operator')
on conflict (tenant_id, user_id) do nothing;

-- ── Business profile ────────────────────────────────────────────────────────

insert into business_profiles (
  id, tenant_id, name, category, city, district, address, description,
  tone, tone_descriptors, emoji_policy, sign_off, negative_policy,
  escalation_email, escalation_phone,
  banned_phrases, preferred_words, do_not_mention,
  languages, primary_language, approval_settings
)
values (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'Cafe Kolektyw', 'cafe', 'Krakow', 'Kazimierz', 'ul. Jozefa 18, 31-056 Krakow',
  'Speciality coffee bar and bakery in a tenement courtyard on Jozefa. Own filter brews, baskijski cheesecake baked every morning, a garden at the back and desks that people actually work from.',
  'warm_professional',
  array['warm', 'specific', 'unfussy', 'never corporate'],
  'match_reviewer',
  'Zespol Cafe Kolektyw',
  'One apology, never two. Name the problem in the reviewer''s own words. Move anything about money, staff or hygiene to email or phone within the first two sentences. Never blame a shift, a supplier or the customer.',
  'kontakt@cafekolektyw.pl', '+48 12 345 67 89',
  array['Drogi Kliencie', 'Panstwa opinia jest dla nas bardzo wazna', 'Dear Customer', 'We apologise for any inconvenience caused', 'najlepsza kawa w Krakowie'],
  array['wpadaj', 'dzieki za te slowa', 'do zobaczenia'],
  array['ceny konkurencji', 'imiona pracownikow', 'rabaty i vouchery', 'sprawy sadowe'],
  array['pl', 'en'], 'pl',
  jsonb_build_object(
    'autoApproveMinStars', 5,
    'requireApprovalWhenRiskFlagged', true,
    'draftsPerGeneration', 2,
    'requireApprovalBeforePublish', true
  )
)
on conflict (id) do nothing;

insert into keyword_banks (id, business_profile_id, name, is_default)
values ('44444444-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Default', true)
on conflict (id) do nothing;

insert into keyword_bank_items (business_profile_id, bank_id, phrase, type, active, usage_count)
values
  ('22222222-2222-4222-8222-222222222222', '44444444-0000-4000-8000-000000000001', 'kawiarnia na Kazimierzu', 'local', true, 6),
  ('22222222-2222-4222-8222-222222222222', '44444444-0000-4000-8000-000000000001', 'kawa speciality w Krakowie', 'service', true, 4),
  ('22222222-2222-4222-8222-222222222222', '44444444-0000-4000-8000-000000000001', 'sniadania na Kazimierzu', 'service', true, 3),
  ('22222222-2222-4222-8222-222222222222', '44444444-0000-4000-8000-000000000001', 'a laptop friendly spot in Krakow', 'service', true, 2),
  ('22222222-2222-4222-8222-222222222222', '44444444-0000-4000-8000-000000000001', 'kawa filtrowana', 'product', true, 5),
  ('22222222-2222-4222-8222-222222222222', '44444444-0000-4000-8000-000000000001', 'sernik baskijski', 'product', true, 3),
  ('22222222-2222-4222-8222-222222222222', '44444444-0000-4000-8000-000000000001', 'ogrod w kamienicy przy Jozefa', 'local', true, 1),
  ('22222222-2222-4222-8222-222222222222', '44444444-0000-4000-8000-000000000001', 'kawiarnia przy Placu Nowym', 'local', true, 2),
  ('22222222-2222-4222-8222-222222222222', '44444444-0000-4000-8000-000000000001', 'brunch in Kazimierz', 'service', true, 1),
  ('22222222-2222-4222-8222-222222222222', '44444444-0000-4000-8000-000000000001', 'palarnia kawy', 'brand', false, 0)
on conflict (business_profile_id, phrase) do nothing;

insert into brand_voice_examples (business_profile_id, example_type, content)
values
  ('22222222-2222-4222-8222-222222222222', 'positive_reply', 'Dziekujemy, Anno. Ta Etiopia rzeczywiscie ma w sobie duzo moreli, cieszymy sie, ze trafila w gust. Wpadaj po kolejny kubek.'),
  ('22222222-2222-4222-8222-222222222222', 'positive_reply', 'Thank you, Sophie. Glad the flat white held up over a whole month of remote work. The corner desk is yours whenever you are back.'),
  ('22222222-2222-4222-8222-222222222222', 'neutral_reply', 'Dziekujemy za szczera opinie. Kolejka w sobote to nasz slaby punkt i pracujemy nad obsada. Damy rade zrobic to lepiej.'),
  ('22222222-2222-4222-8222-222222222222', 'negative_reply', 'Przykro nam, ze wizyta wygladala tak, jak opisujesz. Chcemy to wyjasnic osobiscie, prosze o kontakt na kontakt@cafekolektyw.pl.'),
  ('22222222-2222-4222-8222-222222222222', 'tone_descriptor', 'Warm but never sugary. We sound like a person, not a brand.'),
  ('22222222-2222-4222-8222-222222222222', 'tone_descriptor', 'Short sentences. No corporate filler.'),
  ('22222222-2222-4222-8222-222222222222', 'phrase_to_prefer', 'Dzieki za te slowa'),
  ('22222222-2222-4222-8222-222222222222', 'phrase_to_prefer', 'Wpadaj'),
  ('22222222-2222-4222-8222-222222222222', 'phrase_to_avoid', 'Drogi Kliencie'),
  ('22222222-2222-4222-8222-222222222222', 'phrase_to_avoid', 'Panstwa opinia jest dla nas bardzo wazna')
on conflict do nothing;

insert into review_sources (tenant_id, business_profile_id, source, display_name, connected)
values
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'google', 'Google Business Profile', false),
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'tripadvisor', 'Tripadvisor', false),
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'facebook', 'Facebook Page', false)
on conflict (business_profile_id, source) do nothing;

-- ── Reviews ─────────────────────────────────────────────────────────────────
-- The set covers what a venue really gets in a week: effusive five stars, a
-- detailed four, a mixed three, a furious one star naming a barista, a hygiene
-- complaint, a probable fake, a competitor plug and a legal threat.

insert into reviews (
  id, tenant_id, business_profile_id, source, external_id, reviewer_name, stars,
  review_text, language, sentiment, risk_score, status, requires_approval,
  assigned_to, published_reply, published_at, reviewed_at
)
values
  ('33333333-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
   'google', 'ext-review-0001', 'Anna Kowalczyk', 5,
   'Najlepsza filtrowana kawa na Kazimierzu. Etiopia z waszego palenia pachnie jak dzem morelowy, a obsluga zawsze doradzi bez zadecia. Siedzialam z ksiazka dwie godziny i nikt mnie nie poganial.',
   'pl', 'positive', 4, 'published', false, null,
   'Dziekujemy, Anno. Ta Etiopia rzeczywiscie ma w sobie duzo moreli, cieszymy sie, ze trafila w gust. Kawa filtrowana to u nas codziennosc, wiec wpadaj po kolejny kubek i po kolejna ksiazke.',
   now() - interval '12 days' + interval '3 hours', now() - interval '12 days'),

  ('33333333-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
   'google', 'ext-review-0002', 'Michal Wieczorek', 4,
   'Sernik baskijski swietny, kawa tez. Minus za sobote w porze lunchu, czekalem przy barze jakies dwanascie minut zanim ktos przyjal zamowienie. Poza tym miejsce bardzo klimatyczne.',
   'pl', 'positive', 18, 'published', false, null,
   'Dziekujemy za dobre slowo o serniku baskijskim, pieczemy go u siebie codziennie rano. Sobotni lunch faktycznie potrafi nas zalac, pracujemy nad obsada baru w szczycie. Do zobaczenia niedlugo.',
   now() - interval '10 days' + interval '6 hours', now() - interval '10 days'),

  ('33333333-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
   'google', 'ext-review-0003', 'Sophie Lambert', 5,
   'Found this place while working remotely for a month in Krakow. Reliable wifi, plenty of sockets and the flat white is genuinely excellent. The staff never made me feel guilty for staying a while.',
   'en', 'positive', 3, 'approved', false, null, null, null, now() - interval '8 days'),

  ('33333333-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
   'google', 'ext-review-0004', 'Tomasz Bak', 3,
   'Kawa dobra, ciasto tez, ale muzyka byla tak glosna ze nie dalo sie rozmawiac. Przyszlismy na spokojne popoludnie we dwoje i wyszlismy po pol godziny.',
   'pl', 'mixed', 34, 'pending_approval', true, (select id from auth.users where email = 'jakub@cafekolektyw.pl'), null, null, now() - interval '6 days'),

  ('33333333-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
   'google', 'ext-review-0005', 'Karolina Maj', 1,
   'Czekalam 25 minut na latte, ktore przyszlo zimne. Barista Ola zachowala sie opryskliwie, kiedy poprosilam o poprawienie. Nigdy wiecej, a szkoda bo lokal ladny.',
   'pl', 'negative', 72, 'new', true, null, null, null, now() - interval '3 days'),

  ('33333333-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
   'google', 'ext-review-0006', 'Piotr Zajac', 2,
   'W kawalku ciasta znalazlem wlos. Zwrocilem uwage przy barze, dostalem tylko przeprosiny i nic wiecej. Higiena w takim miejscu powinna byc podstawa.',
   'pl', 'negative', 88, 'new', true, null, null, null, now() - interval '2 days'),

  ('33333333-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
   'google', 'ext-review-0007', 'Julia Nowicka', 5,
   'Polecam!', 'pl', 'positive', 2, 'draft_generated', false, null, null, null, now() - interval '2 days'),

  ('33333333-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
   'tripadvisor', 'ext-review-0008', 'David Reid', 4,
   'Came for brunch on a Sunday. The avocado toast with poached eggs was properly done and the cold brew was a nice surprise. Only complaint is that we waited about twenty minutes for a table.',
   'en', 'positive', 15, 'draft_generated', false, null, null, null, now() - interval '5 days'),

  ('33333333-0000-4000-8000-000000000009', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
   'google', 'ext-review-0009', null, 1,
   'Tragedia. Nie polecam nikomu. Zenada i porazka.',
   'pl', 'negative', 66, 'new', true, null, null, null, now() - interval '4 days'),

  ('33333333-0000-4000-8000-000000000010', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
   'google', 'ext-review-0010', 'Ewa Sikora', 3,
   'Kawa w porzadku, ale w Kolorze obok robia lepsze cappuccino za te same pieniadze. U was ladniej, u nich smaczniej.',
   'pl', 'mixed', 41, 'new', true, null, null, null, now() - interval '7 days'),

  ('33333333-0000-4000-8000-000000000011', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
   'google', 'ext-review-0011', 'Marek Dudek', 1,
   'Zaplacilem za zestaw sniadaniowy, ktorego polowa nie dojechala do stolika. Odmowiono mi zwrotu. Zglaszam sprawe do sanepidu i rzecznika praw konsumenta.',
   'pl', 'negative', 94, 'pending_approval', true, (select id from auth.users where email = 'marta@cafekolektyw.pl'), null, null, now() - interval '1 day'),

  ('33333333-0000-4000-8000-000000000012', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
   'facebook', 'ext-review-0012', 'Nina Petrova', 5,
   'The garden at the back is the best kept secret in Kazimierz. They brought a water bowl for my dog without me asking. Cortado was spot on too.',
   'en', 'positive', 2, 'published', false, null,
   'Thank you, Nina. The water bowl is standard here, dogs are regulars in the garden. Glad the cortado kept up. See you and your companion soon.',
   now() - interval '15 days' + interval '5 hours', now() - interval '15 days'),

  ('33333333-0000-4000-8000-000000000013', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
   'google', 'ext-review-0013', 'Lukasz Frankowski', 4,
   'Przychodze tu popracowac dwa razy w tygodniu. Wifi stabilne, gniazdka przy kazdym stoliku pod oknem. Jedyne co, to czasem brakuje miejsca po 11.',
   'pl', 'positive', 9, 'published', false, null,
   'Dzieki, Lukaszu. Stoliki pod oknem z gniazdkami trzymamy wlasnie dla takich poranków. Po jedenastej robi sie tloczno, wtedy zwykle zwalnia sie antresola. Do zobaczenia w przyszlym tygodniu.',
   now() - interval '20 days' + interval '9 hours', now() - interval '20 days'),

  ('33333333-0000-4000-8000-000000000014', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
   'google', 'ext-review-0014', 'Hanna Tomczyk', 5,
   'Zamowilam u was tort na urodziny corki i wyszedl dokladnie taki, jak na zdjeciu, ktore przyslalam. Dzieciaki zjadly wszystko co do okruszka.',
   'pl', 'positive', 2, 'new', false, null, null, null, now() - interval '1 day')
on conflict (id) do nothing;

-- ── Risk flags ──────────────────────────────────────────────────────────────

insert into review_risk_flags (review_id, flag_type, severity, evidence)
values
  ('33333333-0000-4000-8000-000000000002', 'complaint', 'low', 'czekalem przy barze jakies dwanascie minut'),
  ('33333333-0000-4000-8000-000000000004', 'complaint', 'medium', 'muzyka byla tak glosna ze nie dalo sie rozmawiac'),
  ('33333333-0000-4000-8000-000000000005', 'staff_named', 'high', 'Barista Ola zachowala sie opryskliwie'),
  ('33333333-0000-4000-8000-000000000005', 'complaint', 'high', 'Czekalam 25 minut na latte, ktore przyszlo zimne'),
  ('33333333-0000-4000-8000-000000000006', 'health_safety', 'high', 'W kawalku ciasta znalazlem wlos'),
  ('33333333-0000-4000-8000-000000000006', 'complaint', 'high', 'dostalem tylko przeprosiny i nic wiecej'),
  ('33333333-0000-4000-8000-000000000008', 'complaint', 'low', 'we waited about twenty minutes for a table'),
  ('33333333-0000-4000-8000-000000000009', 'likely_fake', 'medium', 'Brak jakiegokolwiek konkretu, konto bez zdjecia i historii'),
  ('33333333-0000-4000-8000-000000000009', 'unclear_sentiment', 'low', 'Nie wiadomo, czego dotyczy zarzut'),
  ('33333333-0000-4000-8000-000000000010', 'competitor_mention', 'medium', 'w Kolorze obok robia lepsze cappuccino'),
  ('33333333-0000-4000-8000-000000000011', 'legal_threat', 'high', 'Zglaszam sprawe do sanepidu i rzecznika praw konsumenta'),
  ('33333333-0000-4000-8000-000000000011', 'refund_issue', 'high', 'Odmowiono mi zwrotu'),
  ('33333333-0000-4000-8000-000000000011', 'complaint', 'high', 'polowa nie dojechala do stolika')
on conflict (review_id, flag_type) do nothing;

-- ── Drafts ──────────────────────────────────────────────────────────────────

insert into review_drafts (
  id, review_id, model, prompt_version, draft_text, quality_score, selected,
  rationale, safety_tags, keyword_used, created_by, created_at
)
values
  ('55555555-0000-4000-8000-000000000001', '33333333-0000-4000-8000-000000000003',
   'mock-reply-v1', '2026.08.1',
   'Thank you, Sophie. Glad the flat white held up over a whole month of remote work, and that the sockets did their job. Come back for a laptop friendly spot in Krakow whenever you need a desk with better coffee.',
   88, true, 'Echoes the remote work detail, one local phrase, soft return invitation.',
   array['detail_echo', 'keyword_single', 'length_ok'], 'a laptop friendly spot in Krakow',
   (select id from auth.users where email = 'jakub@cafekolektyw.pl'), now() - interval '8 days' + interval '2 hours'),

  ('55555555-0000-4000-8000-000000000002', '33333333-0000-4000-8000-000000000003',
   'mock-reply-v1', '2026.08.1',
   'Thanks Sophie, this made our morning. The flat white is the drink we obsess over most, and we like knowing the corner desk earned its keep. Come back any time you are in Kazimierz.',
   81, false, 'Warmer variant with no keyword, kept as a safer fallback.',
   array['detail_echo', 'length_ok'], null,
   (select id from auth.users where email = 'jakub@cafekolektyw.pl'), now() - interval '8 days' + interval '2 hours'),

  ('55555555-0000-4000-8000-000000000003', '33333333-0000-4000-8000-000000000004',
   'mock-reply-v1', '2026.08.1',
   'Dziekujemy za dobre slowo o kawie i ciescie. Glosna muzyka w sobotnie popoludnie to uwaga, ktora bierzemy na powaznie, sprawdzimy poziom w sali od podworza. Damy rade zrobic wam spokojniejsze popoludnie.',
   84, true, 'Gratitude, acknowledges the specific complaint, no excuse, soft invitation.',
   array['detail_echo', 'length_ok'], null,
   (select id from auth.users where email = 'jakub@cafekolektyw.pl'), now() - interval '6 days' + interval '2 hours'),

  ('55555555-0000-4000-8000-000000000004', '33333333-0000-4000-8000-000000000007',
   'mock-reply-v1', '2026.08.1',
   'Dziekujemy, Julio. Krotko i milo, a nam robi dzien. Kawiarnia przy Placu Nowym to nasz konik, wiec wpadaj na kawe.',
   71, false, 'Nothing specific to echo, so the reply stays short and adds one local anchor.',
   array['keyword_single', 'length_ok'], 'kawiarnia przy Placu Nowym',
   (select id from auth.users where email = 'jakub@cafekolektyw.pl'), now() - interval '2 days' + interval '2 hours'),

  ('55555555-0000-4000-8000-000000000005', '33333333-0000-4000-8000-000000000008',
   'mock-reply-v1', '2026.08.1',
   'Thank you, David. The poached eggs are the part we are most protective of, so that is good to hear. Sunday brunch does build a queue, and reserving ahead usually skips it. See you next time.',
   86, false, 'Echoes the eggs, answers the wait with a practical tip, no excuse.',
   array['detail_echo', 'length_ok'], null,
   (select id from auth.users where email = 'jakub@cafekolektyw.pl'), now() - interval '5 days' + interval '2 hours'),

  ('55555555-0000-4000-8000-000000000006', '33333333-0000-4000-8000-000000000011',
   'mock-reply-v1', '2026.08.1',
   'Panie Marku, przykro nam, ze zamowienie nie dotarlo w calosci. Chcemy to wyjasnic i uporzadkowac platnosc, prosze o kontakt na kontakt@cafekolektyw.pl albo 12 345 67 89. Odezwiemy sie tego samego dnia.',
   90, true, 'One apology, no admission of fault, no public refund talk, straight to a private channel.',
   array['no_public_refund', 'escalation_contact', 'single_apology'], null,
   (select id from auth.users where email = 'marta@cafekolektyw.pl'), now() - interval '1 day' + interval '2 hours')
on conflict (id) do nothing;

-- ── Approvals ───────────────────────────────────────────────────────────────

insert into review_approvals (review_id, draft_id, decision, approved_by, notes, created_at)
values
  ('33333333-0000-4000-8000-000000000003', '55555555-0000-4000-8000-000000000001',
   'approved', (select id from auth.users where email = 'marta@cafekolektyw.pl'),
   'Good echo of the remote work detail. Nothing to change.', now() - interval '8 days' + interval '3 hours')
on conflict do nothing;

-- ── Activity ────────────────────────────────────────────────────────────────

insert into activity_logs (tenant_id, actor_user_id, actor_name, entity_type, entity_id, action, metadata, created_at)
values
  ('11111111-1111-4111-8111-111111111111', null, 'Review sync', 'review', '33333333-0000-4000-8000-000000000005', 'review.created', '{"source":"google","stars":1}', now() - interval '3 days'),
  ('11111111-1111-4111-8111-111111111111', (select id from auth.users where email = 'jakub@cafekolektyw.pl'), 'Jakub Nowak', 'review_draft', '33333333-0000-4000-8000-000000000004', 'draft.generated', '{"count":2,"model":"mock-reply-v1"}', now() - interval '6 days' + interval '2 hours'),
  ('11111111-1111-4111-8111-111111111111', (select id from auth.users where email = 'marta@cafekolektyw.pl'), 'Marta Zielinska', 'review', '33333333-0000-4000-8000-000000000003', 'review.approved', '{"notes":"Good echo of the remote work detail."}', now() - interval '8 days' + interval '3 hours'),
  ('11111111-1111-4111-8111-111111111111', (select id from auth.users where email = 'marta@cafekolektyw.pl'), 'Marta Zielinska', 'review', '33333333-0000-4000-8000-000000000001', 'review.published', '{"stars":5,"source":"google"}', now() - interval '12 days' + interval '3 hours'),
  ('11111111-1111-4111-8111-111111111111', (select id from auth.users where email = 'marta@cafekolektyw.pl'), 'Marta Zielinska', 'business_profile', '22222222-2222-4222-8222-222222222222', 'business_profile.updated', '{"fields":["negativePolicy","bannedPhrases"]}', now() - interval '4 days')
on conflict do nothing;
