# Exa.ai w toodip: co to jest, co z tego wyciągnąć, ile kosztuje

Stan na 17 października 2026. Fakty z dokumentacji Exa (exa.ai/docs, exa.ai/pricing) i OpenRouter; wnioski i plan to moja analiza.

## 1. Fakt, od którego trzeba zacząć: już używamy Exa, nie wiedząc o tym

- OpenRouter uruchamia wyszukiwanie dla modeli bez własnego searcha przez Exa (tryb `auto`). Nasz silnik pomiarowy `openai/gpt-4o-mini:online` to w praktyce **GPT-4o mini czytający 5 wyników z Exa**, nie ChatGPT z Bingiem.
- Dowód w naszej bazie: w 700 cytowaniach z pomiarów toodip 69 (10%) to adresy `exa.ai/library/places/…`, czyli karty lokali z indeksu Exa Places. Exa jest dziś naszym największym pojedynczym "źródłem".
- Konsekwencja produktowa: to, czy lokal istnieje w indeksie Exa i jak jest tam opisany, bezpośrednio decyduje, czy nasz pomiar go wymieni. Exa trzeba traktować jako **osobny, trzeci silnik**: "AI z wyszukiwaniem Exa" to realna warstwa pod setkami agentów (73 mln zapytań przez OpenRouter, 400+ modeli), a Profound w planie Enterprise śledzi "Exa Search" jako jeden z 9 silników odpowiedzi.
- Test z 17.10 (OpenRouter, narzędzie `openrouter:web_search`, pytanie "Gdzie napić się dobrej matchy w Krakowie?"):

| Model i silnik | Co cytuje | Koszt |
|---|---|---|
| `openai/gpt-4o-mini`, engine native | te same artykuły co Exa (model nie ma własnego searcha, OpenRouter cicho wraca do Exa) | 0,008 $ |
| `openai/gpt-4o-mini`, engine exa | mjakmalopolska.pl, naszemiasto, tastetown | 0,008 $ |
| **`openai/gpt-4.1-mini`, engine native** | **karty Google Maps z `utm_source=openai`**: Café Belmont, Mori Matcha, Café Manggha, Karma Coffee, dokładnie tak odpowiada ChatGPT na pytania lokalne | 0,014 $ |

  Wniosek: kolumna "ChatGPT" powinna iść przez `gpt-4.1-mini` z natywnym searchem (prawdziwe zachowanie ChatGPT, w tym poleganie na Google Maps), a dotychczasowy silnik to osobna kolumna "Agents on Exa". Uwaga: OpenRouter oznaczył `:online` i plugin `web` jako przestarzałe; właściwa forma to `tools: [{ type: "openrouter:web_search", engine, max_results }]`.

## 2. Co Exa oferuje (fakty)

| Produkt | Co robi | Cena |
|---|---|---|
| Search `instant` / `fast` / `auto` | wyszukiwanie neuralne + słowa kluczowe, do 100 wyników, filtry domen (1200), dat, `userLocation` (kraj / współrzędne), treść strony, highlights, podsumowanie wg schematu JSON, `subpages`, `outputSchema` (ustrukturyzowana odpowiedź) | 4 $ / 7 $ za 1000 zapytań (do 10 wyników), +1 $ za 1000 dodatkowych wyników, treść 1 $ za 1000 stron na typ |
| Deep Search `deep-lite` / `deep` / `deep-reasoning` | wieloetapowe wyszukiwanie z syntezą, 4–40 s, `additionalQueries` | 12–15 $ za 1000 |
| Exa Places | 210 mln lokali i miejsc w tym samym indeksie: adres, współrzędne, godziny i godziny szczytu, ocena i liczba ocen, najnowsze opinie, kategoria, tagi, telefon, poziom cen, linki do strony, rezerwacji, menu i social. Wyniki pojawiają się same w `auto` i `fast` | w cenie zwykłego searcha |
| Answer | odpowiedź LLM z cytowaniami (`exa`, `exa-pro`, `exa-research`, `exa-fast`), `userLocation`, `outputSchema` | 5 $ za 1000 |
| Monitors | zapisane zapytanie uruchamiane co 1 h … 7 dni, webhook dostaje **tylko nowe** wyniki (deduplikacja), podsumowania wg schematu | 15 $ za 1000 uruchomień |
| Websets | zbiór encji zbudowany z kryteriów w języku naturalnym, weryfikacja każdej pozycji, wzbogacanie (tekst, liczba, data, bool), import własnych URL, webhooki | Starter 49 $/mies. (8000 kredytów), Pro 449 $/mies. (100 000), 10 kredytów za pasującą pozycję |
| Agent | asynchroniczny agent researchowy: listy, wzbogacanie, weryfikacja twierdzeń, `outputSchema`, budżet na run | stałe: 0,012 / 0,025 / 0,10 / 0,50 / 1,00 $ za run (minimal→xhigh); `auto` do 5 $, `ultra` do 20 $ |
| Exa Connect | źródła w Agencie: **Similarweb** (ruch i ranking domeny, 0,30 $ za kredyt), Fiber (kontakty B2B), Baselayer (KYB), Affiliate, Particle (podcasty), Financial Datasets, Jinko | osobno, per wywołanie |

Limity: 10 QPS na search/answer, 5 QPS deep i agent (50 równoległych runów), 100 QPS contents; 25 QPS po 1000 $ wpłaty w 30 dni. Darmowo: 10 $ miesięcznie odnawiane. Indeks "odświeżany ciągle", wiele języków, brak oficjalnej deklaracji o pokryciu polskiego lokalnego webu (do sprawdzenia empirycznie, patrz pkt 6).

## 3. Zastosowania dla toodip, od najcenniejszych

### A. Trzeci silnik pomiaru: "Exa Answer" i uczciwe nazwanie obecnego
- Dodajemy platformę `exa` do ledgera pomiarów: `POST /answer` z `userLocation: {country:"PL", lat, lng}` lokalu i tymi samymi 50 pytaniami. 5 $ za 1000 = **0,25 $ za cały raport 50×1**, z cytowaniami i pozycjami w tekście.
- Dotychczasowy silnik przez OpenRouter opisujemy jako "GPT-4o mini + Exa search", a "ChatGPT" mierzymy natywnym searchem OpenAI. Klient widzi trzy kolumny: ChatGPT, Perplexity (sonar), Exa-powered agents. To jest prawdziwszy obraz "AI" niż jeden model.

### B. Audyt obecności lokalu w Exa Places: nowy sygnał w panelu ("Czy agenci AI w ogóle Cię znają?")
- Jedno zapytanie `search` o lokal (`"Café Belmont Kraków"`, `type: fast`) zwraca kartę Places: adres, godziny, ocena, liczba opinii, kategoria, tagi, linki do menu i rezerwacji. Koszt 0,007 $.
- Porównujemy z profilem w toodip: brak godzin, brak linku do menu, zła kategoria, stara ocena = konkretne zadania w "What do I do about it". To są dane, których Google nie pokaże właścicielowi, a które czytają agenci.
- Dla konkurencji z listy "Who is taking my spot" robimy to samo i pokazujemy tabelę: kto ma menu, rezerwację, tagi, które my mamy puste.

### C. Source Authority zrobiony porządnie: które strony Exa uważa za autorytet dla kategorii
- `search` z `category`-neutralnym zapytaniem klienta ("najlepsza matcha Kraków") × 50 pytań × `numResults: 25` daje mapę domen, które indeks podsuwa modelom, **zanim** model cokolwiek napisze. To "podaż źródeł" w odróżnieniu od naszych cytowań ("popyt").
- Koszt: 50 × (0,007 + 0,015) ≈ 1,10 $ na klienta miesięcznie. Z tego: lista "guides to pitch" z realnym wpływem (domeny wysoko w Exa, bez wzmianki o kliencie), czyli gotowy plan PR dla właściciela.
- `includeDomains: [domena klienta]` + 50 pytań = test, czy własna strona w ogóle "odpowiada" na pytania klientów w oczach indeksu. Wynik 0 trafień = strona nie ma treści, którą agenci mogą cytować (dokładnie przypadek belmont.cafe vs bruk.cafe).

### D. Monitors jako alerty: "AI zaczęło / przestało Cię polecać" i "pojawił się nowy ranking"
- Monitor na `"<nazwa lokalu>"` z `period: 1d` → webhook z nowymi stronami wspominającymi lokal (recenzje, blogi, listy). 15 $ za 1000 uruchomień = **0,45 $ na klienta miesięcznie** przy codziennym sprawdzaniu.
- Monitor na kategorię ("najlepsze kawiarnie Kraków ranking") → nowe listy i przewodniki w mieście, w które warto się wbić, zanim zaczytają je modele. To jest funkcja, której nie ma Profound.

### E. Websets do sprzedaży i benchmarku kategorii
- Webset "specialty coffee shops in Kraków with own website" z wzbogaceniami (Instagram, czy strona ma menu, ocena) = lista prospektów dla toodip i jednocześnie **benchmark kategorii** ("średnia kawiarnia w Krakowie: 3 z 10 ma menu w schema").
- Starter 49 $/mies., 8000 kredytów = 800 zweryfikowanych lokali. Jedno miasto na miesiąc.

### F. Agent do onboardingu klienta: profil lokalu z sieci w 60 sekund
- Exa Agent `effort: low` (0,025 $) z `outputSchema` {kategoria, dzielnica, specjalności, języki, konkurenci, godziny, linki} buduje profil z samego adresu www. Dziś generator baterii bierze profil ręczny plus 3 kB tekstu strony; z Agentem bateria DeepSeeka dostaje pełny kontekst, a klient nie wypełnia formularza.
- Z Connect/Similarweb: szacowany ruch domen konkurentów i przewodników (0,30–4,50 $ za domenę) do rankingu "które źródło warto zdobyć".

### G. Treść dla GEO: "napisz to, czego brakuje"
- Z (C) wiemy, których pytań własna strona nie "odpowiada". Z Places wiemy, jakich faktów brakuje w karcie. Łącząc to z DeepSeekiem, generujemy właścicielowi gotowe bloki: FAQ, sekcję menu w schema.org, opis dzielnicy. Pomiar po 30 dniach pokaże, czy Exa zaczęło cytować stronę. Zamknięta pętla: zmierz → napraw → zmierz.

## 4. Czego Exa nie da i gdzie uważać

- Indeks: 1,4 bln adresów, 100 mld stron, 350 mln publikacji, 1 mld profili osób; odświeżanie "ciągłe", newsy w minutach. Od listopada 2025 wyniki są **domyślnie ograniczone do języka zapytania** i nie ma na to przełącznika: pytanie po polsku dostaje polskie strony, po angielsku angielskie. Dla nas to zaleta (dwujęzyczna bateria mierzy dwa światy), ale trzeba o tym pamiętać przy porównaniach.
- Brak jakiejkolwiek wzmianki o Google Maps, Instagramie i Facebooku w dokumentacji; crawler respektuje robots.txt i nie wchodzi za logowanie. Recenzje zewnętrzne mówią o słabym pokryciu social i forów. Czyli Exa widzi stronę www lokalu, przewodniki i media, nie widzi Instagrama.
- Research API wycofane (kwiecień 2026) na rzecz `deep-reasoning`; `findSimilar` przestarzałe; Websets Monitors działają najwyżej raz dziennie; snapshoty stron sięgają 5 miesięcy wstecz.

- Exa to nie ChatGPT ani Google AI Overviews. Pomiar przez Exa mówi "jak widzą Cię agenci korzystający z Exa", nie "jak widzi Cię ChatGPT". W panelu nazywamy to po imieniu.
- Pokrycie polskiego lokalnego webu i Instagrama nie jest udokumentowane. Trzeba zmierzyć (pkt 6) zanim obiecamy klientom.
- Karty Places są "budowane per wyszukiwanie i cache'owane krótko": treść bierzemy w tym samym wywołaniu, nie dociągamy później.
- Websets to osobny abonament i osobne kredyty; opłaca się dopiero przy pracy nad całym miastem, nie dla jednego klienta.
- Agent `auto`/`ultra` bez `maxCostDollars` może kosztować 5–20 $ za run. Zawsze ustawiamy budżet.

## 4a. Alternatywy (ta sama operacja: wyszukiwanie, ok. 10 wyników)

| API | Cena | Po co nam |
|---|---|---|
| Exa auto | 0,007 $ z treścią stron | mapa źródeł, Places, Monitors |
| Tavily | ok. 0,008 $ (1 kredyt), 1000 kredytów/mies. gratis | zamiennik searcha, bez Places |
| Brave Search | 0,005 $, 50 QPS | tani search, brak treści stron |
| SerpAPI | 0,025 $ (spada do 0,002 $ przy wolumenie), silniki Google Maps, **Google AI Mode i AI Overviews** | jedyna droga do pomiaru Google AI Overviews, potrzebna osobno |
| Perplexity Search / Sonar | 0,005 $ search; Sonar 5–12 $/1000 zapytań + tokeny | już używamy Sonar jako silnika Perplexity |
| Firecrawl | 2 kredyty za 10 wyników, ok. 0,0064 $ | scrapowanie stron klientów (treść pod GEO) |

Exa jest jedyne z Places i Monitors; SerpAPI jest jedyne z Google AI Overviews. Oba uzupełniają się, nie konkurują.

## 5. Koszt na klienta i w planie

| Element | Miesięcznie na klienta |
|---|---|
| Pomiar Exa Answer 50 pytań × 2 | 0,50 $ |
| Mapa źródeł kategorii (C) | 1,10 $ |
| Audyt Places lokal + 10 konkurentów (B) | 0,08 $ |
| Monitor lokal + monitor kategorii, codziennie (D) | 0,90 $ |
| Razem Exa | **ok. 2,60 $** |
| Dla porównania: dzisiejszy raport przez OpenRouter | 0,56 $ |

Przy planie 199 € to nadal poniżej 2% ceny. Przy 100 klientach: ~260 $ miesięcznie, mieści się w pay-as-you-go bez rozmowy z sales (limit 10 QPS wystarcza do kilkuset klientów, bo kolejka i tak idzie sekwencyjnie).

## 6. Plan wdrożenia

1. **Tydzień 1, test pokrycia (0 $, darmowe 10 $ kredytów).** Konto Exa, 50 pytań Belmont przez `search auto` i `answer`, karty Places dla 15 lokali z rankingu. Mierzymy: ile lokali ma kartę, ile polskich domen w wynikach, czy belmont.cafe się pojawia. Decyzja "go" tylko gdy pokrycie > 70% lokali z naszego rankingu.
2. **Tydzień 2, silniki.** Kolumna ChatGPT przez `openai/gpt-4.1-mini` + natywny search (0,014 $/pomiar, cytuje Google Maps jak prawdziwy ChatGPT); kolumna "Agents on Exa" przez `openrouter:web_search engine: exa` (0,008 $); Perplexity przez Sonar. Platforma `exa` w enumie (migracja), trzy kolumny w panelu, uczciwe etykiety. Migracja z przestarzałego `:online` na `tools`.
3. **Tydzień 3, moduł "Sources" 2.0.** Mapa podaży źródeł (C) + audyt Places (B) jako nowe sekcje w AI Visibility; zadania w planie działań generowane z różnic.
4. **Tydzień 4, alerty.** Monitors z webhookiem do `/api/exa/webhook`, zapis do `interventions`/nowej tabeli `signals`, e-mail do właściciela.
5. **Później.** Websets dla sprzedaży i benchmarku miasta; Agent w onboardingu; Similarweb w rankingu źródeł.

## 7. Wycena pod ofertę

- Nic z powyższego nie wymaga nowego planu cenowego: wchodzi do Visibility 199 € jako "3 silniki + alerty + audyt obecności w AI". To argument sprzedażowy, nie koszt.
- Jeśli chcemy osobny produkt: "AI Presence Audit" jednorazowo (karta Places, mapa źródeł, 10 zadań) za 149–249 € robi się w pełni automatycznie, koszt Exa poniżej 2 $, czas poniżej 5 minut. Dobry wabik przed abonamentem i naturalna treść darmowego "AI check" na stronie głównej (jedno zapytanie Places + 10 pytań Answer = 0,06 $ za lead).
