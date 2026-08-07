# Wniosek o dostęp do Google Business Profile API

Instrukcja po polsku, treść wniosku po angielsku, bo Google czyta go po angielsku.

---

## Zanim wyślesz: co Google naprawdę sprawdza

Dostęp do tego API jest na listę dopuszczonych. Google nie pyta o wizytówkę dlatego, że API jej technicznie potrzebuje, tylko dlatego, że to jest ich sposób na sprawdzenie, czy po drugiej stronie stoi prawdziwa firma z prawdziwym powodem. Nic więcej.

Jako agencja **nie musisz zakładać własnej wizytówki dla NotASlop**. Warunek mówi o **zarządzaniu** zweryfikowaną wizytówką działającą od co najmniej 60 dni, a nie o jej posiadaniu. Rola menedżera na wizytówce klienta to spełnia.

Sprawdź więc:

1. **Jesteś menedżerem na przynajmniej jednej zweryfikowanej wizytówce klienta, która istnieje od ponad 60 dni.** Bruk Cafe albo lokal Filipa. Klient dodaje Cię w swoim panelu Google, w sekcji Użytkownicy. To zajmuje mu minutę.
2. **Adres e-mail w domenie firmowej**, czyli `kontakt@notaslop.com`, nie prywatny gmail.
3. **Strona firmowa działa**, `notaslop.com` się nadaje.

**Bierz rolę menedżera, nigdy właściciela.** Google wprost odradza partnerom zewnętrznym wchodzenie na wizytówkę klienta jako właściciel. Menedżer wystarcza do czytania opinii i publikowania odpowiedzi, a klient zachowuje pełną kontrolę i może Cię odpiąć jednym kliknięciem. To jest też argument sprzedażowy, nie tylko techniczny.

**Załóż konto organizacji GBP jako agencja.** To struktura Google dla firm zarządzających cudzymi wizytówkami. Porządkuje dostępy i wygląda poważniej we wniosku niż pojedyncze konto.

---

## Krok po kroku

**1. Załóż projekt w Google Cloud Console** (albo użyj istniejącego).

**2. Zapisz Project Number.** Znajdziesz go na pulpicie projektu, w karcie Project info. To ta liczba, nie Project ID. Wniosek o nią pyta.

**3. Wejdź na formularz:**

https://support.google.com/business/contact/api_default

**4. Z listy wybierz „Application for Basic API Access".**

**5. Wypełnij odpowiedziami poniżej.** Odpowiadaj konkretnie. Google sam pisze, że niekompletne i ogólnikowe wnioski są odrzucane, a nieprawdziwe informacje mogą zamknąć dostęp na stałe.

**6. Czekaj.** Od 3 do 10 dni roboczych, w praktyce bywa do dwóch tygodni. Odpowiedź przychodzi mailem.

**7. Sprawdzaj status w Google Cloud Console**, w limitach projektu: **0 QPM oznacza, że jeszcze nie przyznali. 300 QPM oznacza, że masz dostęp.**

---

## Gotowe odpowiedzi do wklejenia

Uzupełnij tylko to, co w `[nawiasach]`.

### Company name
```
NotASlop
```

### Company website
```
https://notaslop.com
```

### Google Cloud Project Number
```
[wklej z karty Project info]
```

### Do you manage your own locations, or locations on behalf of other businesses?
```
On behalf of other businesses. NotASlop is an agency working with independent
local venues under a written service agreement. Each client adds us as a
manager on their own Business Profile, never as an owner, so they keep full
control and can remove our access at any time from their own account. Access is
granted explicitly through the Google OAuth consent screen by the account that
owns the profile. We never request access to a profile we have not been engaged
to manage.
```

### Describe your business and how you intend to use the API
```
NotASlop is a local visibility agency based in Krakow, Poland. We work with
independent local businesses, primarily cafes, restaurants and other
hospitality venues.

We have built an internal product called toodip, a review response tool used by
our team and by our clients' own staff. It solves a specific and common problem
for a small venue: reviews arrive faster than the owner can answer them well,
so replies are either late, generic, or written in a hurry after a bad day.

toodip does three things with a review:

1. Classifies it. It detects sentiment and flags reviews that need care before
   anyone answers: complaints, hygiene issues, refund disputes, legal threats,
   reviews naming an employee, and likely fake reviews.
2. Drafts a reply in the venue's own voice, using a profile the owner
   configures: tone, phrases the business refuses to use, escalation contact,
   and its own vocabulary. Drafts are checked automatically against those rules
   before anyone sees them.
3. Routes it for approval. Anything below the owner's rating threshold, and
   anything carrying a risk flag, cannot be published without a person
   approving it. This is enforced in the product, not left to discipline.

We intend to use the API for exactly two operations:

- Reading reviews for a connected location, so they appear in the tool instead
  of being copied by hand.
- Publishing the owner's approved reply back to the review it answers.

We do not intend to modify business information, hours, photos, posts or any
other part of a profile through the API.
```

### Which APIs and methods do you plan to use?
```
Google My Business API v4:
  accounts.locations.reviews.list       to read reviews for a connected location
  accounts.locations.reviews.updateReply to publish an owner reply

My Business Account Management API and My Business Business Information API,
read only, to list the accounts and locations a client has granted us access
to, so the right profile can be connected to the right workspace.

OAuth scope: https://www.googleapis.com/auth/business.manage
```

### How many locations do you expect to manage?
```
[liczba] today, and we expect fewer than 100 within the first year. We work
with independent venues one at a time rather than at bulk scale.
```

### Expected API call volume
```
Low. Reviews are polled a few times per day per location, not continuously, and
replies are published one at a time after a human approves them. We estimate
well under 100 calls per location per day.
```

### How do you store and protect the data?
```
Review data is stored in a Postgres database hosted on Supabase, in the
European Union. Each client is a separate tenant, and isolation is enforced by
row level security policies in the database, so one client's data is not
reachable from another client's session even if the application had a bug.

OAuth tokens are stored encrypted and are never exposed to the browser. Every
action taken on a review, including who approved and published a reply, is
recorded in an append only audit log that the client can read.

Clients can revoke our access at any time from their Google account, and we
delete their stored review data on request.
```

### Anything else?
```
We are aware of the review reply guidelines and have built the product around
them rather than around volume. Replies are never published automatically when
a review carries a risk flag, the tool refuses to discuss refunds or name
employees in a public reply, and it will not generate a reply that invents
facts about the business.
```

---

## Czego nie pisać

- **Nie obiecuj automatycznej publikacji bez człowieka.** To jest dokładnie ten sygnał, który każe recenzentowi przyjrzeć się wnioskowi dłużej.
- **Nie proś o więcej zakresów, niż potrzebujesz.** Rozszerzanie zakresu poza uzasadnienie potrafi wywołać ponowną weryfikację.
- **Nie pisz ogólników w stylu „zarządzanie obecnością w sieci".** Konkret o dwóch metodach API działa lepiej niż akapit marketingu.

---

## Po zgodzie

Napisz do mnie, że limit skoczył na 300 QPM. Wtedy dokładam konektor: ekran łączenia wizytówki przez OAuth w ustawieniach lokalu, import opinii i odesłanie zatwierdzonej odpowiedzi. Architektura jest pod to gotowa, tabela `review_sources` czeka pusta, a publikacja wpina się w to samo miejsce, w którym dziś jest ręczne oznaczanie.
