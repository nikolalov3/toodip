# toodip, stan produktu

Dokument roboczy dla właściciela produktu. Po polsku, bo to notatka do planowania, a nie część kodu. Reszta repo jest po angielsku.

Stan na 17 listopada 2026. Zastępuje wersję z sierpnia (tamta opisywała moduł odpowiedzi na opinie, którego już nie ma).

## Czym jest toodip

Panel pomiarowy dla lokalu: czy asystenci AI (ChatGPT, Google AI) polecają lokal, kogo polecają zamiast niego, co czytają, i jaki ruch z tego wynika na stronie. Raz w tygodniu (albo w miesiącu) panel zadaje stały zestaw pytań, zapisuje odpowiedzi i mówi, co się zmieniło i co z tym zrobić.

Zasada, której trzyma się cały kod: **liczy algorytm, model tylko pisze**. Każda liczba, każde porównanie i każdy werdykt ("realny wzrost", "w granicach szumu") powstają z reguł. Model (DeepSeek) robi dwie rzeczy: wyciąga nazwy lokali z odpowiedzi i ubiera gotowe fakty w zdania.

**Legenda:** ✅ działa na prawdziwej bazie · 🟡 działa, ale czegoś brakuje · ⬜ nie zrobione

---

## Co jest w panelu

### Report ✅ (nowe, 17 XI)
Strona startowa. Jeden raport na okres: werdykt w dwóch zdaniach, wynik każdego asystenta z przedziałem ufności, lista wniosków od najważniejszego, asystenci obok siebie, ruch na stronie z tygodnia, trzy pierwsze kroki. Starsze raporty pod "Other reports" i w Report history.

### AI Visibility ✅ (przebudowane na zakładki, 17 XI)
- **Summary**: cztery liczby, wnioski, trend z pasmem niepewności, co się zmieniło od poprzedniego pomiaru.
- **Assistants**: ChatGPT i Google AI na tych samych pytaniach: typ po typie, pytanie po pytaniu, kogo poleca każdy z nich, co każdy czyta.
- **Questions**: typy pytań, każde pytanie z wynikiem, wygrane i stracone.
- **Competitors**: share of voice, pozycja w odpowiedzi, head to head z wybranym rywalem.
- **Sources**: co czytają asystenci, które źródła stoją za wzmiankami o lokalu, a które tylko za rywalami.
- **Answers**: cytaty, słowa przy nazwie lokalu, surowe odpowiedzi jako dowód.
- **Actions**: plan z liczbami i dziennik zmian z wynikiem przed i po.
- **Setup**: harmonogram, bateria pytań, ręczny pomiar (z wyborem asystenta), metoda.

Przełącznik asystenta jest na każdej zakładce. Liczby z różnych asystentów i różnych modeli nigdy nie są sumowane ani porównywane w jednej linii.

### Website ✅
Cztery zakładki: Traffic, From AI, Conversions, AI crawlers. Dane z własnego trackera (skrypt na stronie klienta plus hak na boty).

### Survey ✅ (tymczasowe, tylko Café Belmont)
Wyniki ankiety "skąd o nas wiesz" z belmont.cafe/visit. Do usunięcia według instrukcji w `lib/survey-module.ts`.

### Konto ✅
Team, Account, Billing, Clients (tylko platforma). Publiczna rejestracja jest zamknięta (`ALLOW_PUBLIC_SIGNUP`), konta zakłada platforma z ekranu Clients.

---

## Jak działa pomiar

| | Raport tygodniowy | Raport miesięczny |
| --- | --- | --- |
| Kto | Café Belmont (lista w `lib/weekly-reports.ts`, nadpisywana przez `WEEKLY_REPORT_TENANTS`) | pozostali klienci z planem pomiarowym |
| Kiedy | każdy poniedziałek | 1. dnia miesiąca |
| Asystenci | ChatGPT i Google AI | ChatGPT |
| Rozmiar | pytania × 2 powtórzenia × 2 asystentów (Belmont: 34 × 2 × 2 = 136 odpowiedzi) | pytania × 2 powtórzenia |
| Ruch | tydzień przed poniedziałkiem raportu, obok tygodnia wcześniejszego | ostatnie 30 dni |

- **ChatGPT**: `openai/gpt-4o-mini:online` przez OpenRouter (model GPT z wyszukiwaniem na żywo). Około 0,008 USD za odpowiedź.
- **Google AI**: `google/gemini-3.8-flash` przez OpenRouter z natywnym Google Search (wyszukuje sam Google, nie zewnętrzny indeks). Około 0,035 USD za odpowiedź. To najbliższy powtarzalny pomiar tego, co odpowiada AI Google'a; nie jest to zrzut okienka AI Overviews.
- **Liczy się tylko odpowiedź z wyszukiwaniem.** Zostawiony sam sobie Gemini odpowiada na mniej więcej 4 pytania z 10 z pamięci, bez wyszukiwania (pierwszy raport: 22 odpowiedzi, w żadnej nie było Belmont; w odpowiedziach z wyszukiwaniem był w około 60%). Dlatego pytanie do Google idzie z jedną stałą instrukcją "najpierw wyszukaj", a odpowiedź bez wyszukiwania jest pytana ponownie i nie wchodzi do liczb. Te z pierwszego raportu zostały w bazie jako dowód, raport pokazuje je osobnym wnioskiem.
- **Raport sam się domyka.** Tygodniowy raport czyta z bazy, czego mu brakuje (każde pytanie: 2 odpowiedzi na każdym asystencie), i dopytuje to, co się nie udało albo przyszło bez wyszukiwania. Ma zapas jednej czwartej prób, potem zamyka się z tym, co ma.
- Koszt tygodnia dla Belmont: około 3 USD, czyli około 12 USD miesięcznie.
- Kolejka: `measurement_jobs`, jeden wiersz na klienta i okres, obsługiwana w krótkich porcjach przez `/api/cron/measure` (Vercel Cron raz dziennie plus GitHub Actions co 10 minut). Raport w trakcie nie jest pokazywany jako wynik: panel pokazuje ostatni skończony i pasek postępu. Raport niedokończony do końca swojego okresu jest zamykany z tym, co ma.
- Limity: dzienny limit wydatków platformy (domyślnie 25 USD), miesięczny limit odpowiedzi z planu, oba rezerwowane atomowo w bazie.

## Jak działa analiza

1. **Fakty** liczy panel z zapisanych odpowiedzi: udział odpowiedzi z nazwą lokalu, share of voice, pozycja, źródła przypisane do konkretnej pozycji listy, typy pytań.
2. **Istotność** (`lib/stats-math.ts`): każda zmiana przechodzi test dwóch proporcji, każdy wynik ma przedział Wilsona. Przy około 70 odpowiedziach zmiana liczy się od około 15 punktów; mniejsza jest opisywana jako szum, nie jako sukces albo porażka.
3. **Wnioski** (`services/insights.ts`): reguły, które z faktów układają zdania w kolejności ważności: realna zmiana, różnica między asystentami, stracone i wygrane pytania, rywale, źródła, ruch, boty.
4. **Podsumowanie słowne** (`services/analyst.ts`): DeepSeek dostaje wyłącznie ponumerowane fakty. Lint odrzuca każde zdanie z liczbą lub domeną, której nie ma w faktach. Gdy żaden model nie odda czystej notatki, panel pisze ją sam z tych samych faktów.

---

## Pierwszy raport tygodniowy (Belmont, tydzień od 16 XI)

Zamknięty na 125 ze 136 odpowiedzi decyzją właściciela: ChatGPT 68 z 68, Google AI 57 z 68 (11 odpowiedzi Google zabrakło, gdy skończyły się środki; 22 odpowiedzi "z pamięci" leżą w bazie poza liczbami).

| | Wynik | Zmiana |
| --- | --- | --- |
| ChatGPT | 47% (32 z 68), przedział 36-59% | 40% w listopadzie, w granicach szumu |
| Google AI | 47% (27 z 57), przedział 35-60% | pierwszy pomiar |
| Wizyty z AI, 9-15 XI | 4 (wszystkie z ChatGPT) | 3 tydzień wcześniej, szum |
| Pobrania przez boty AI | 31 | 46 tydzień wcześniej, szum |

Belmont jest najczęściej wymienianym lokalem u obu asystentów. Wynik niesie typ "Matcha spots" (22 z 24 i 23 z 23); w pięciu z dziewięciu typów pytań nie pada ani razu. Podsumowania słowne dla obu asystentów są zapisane.

## Co czeka na Ciebie

0. **Doładować OpenRouter.** 17 XI na koncie zostało 0,01 USD (kupione 87,00, zużyte 86,99). Bez środków nie działa żaden pomiar ani podsumowanie. Tydzień Belmont to około 3 USD, miesiąc wszystkich klientów dziś około 15 USD. Następny raport Belmont startuje w poniedziałek 23 XI.
1. ~~Uruchomić SQL~~ Zrobione 17 XI: tabele `analyses`, `gsc_properties`, `gsc_daily` są w bazie, pierwsze podsumowanie słowne zapisane (DeepSeek v3.2, 6 punktów, wszystkie przeszły kontrolę liczb).
2. **Stripe**: prawdziwy `STRIPE_SECRET_KEY` (obecny jest nieprawidłowy), `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL` na produkcji, VAT w Stripe. Do tego czasu przyciski zakupu są wyłączone.
3. **Search Console**: konto serwisowe Google (`GSC_SERVICE_ACCOUNT_JSON`) i dodanie go jako użytkownika w Search Console belmont.cafe. Wtedy popyt z Google wchodzi do analizy Google AI.
4. **Dwa spamowe workspace'y** z sierpnia ("Gulrxujp LLC", "Sssiquv LLC"): czekają na Twoje potwierdzenie usunięcia.

## Otwarte decyzje

- **Model ChatGPT w raporcie.** Raport jedzie na GPT-4o mini (tani, seria od października). Ręczne pomiary z 15 X i 8 XI były na domyślnym modelu ChatGPT (`gpt-chat-latest`, około 0,064 USD za odpowiedź). Przejście raportu na ten model to nowa seria i około 4,4 USD więcej tygodniowo.
- **Strona główna i cennik.** Publiczny `/pricing` nadal opisuje moduł odpowiedzi i 7 dni próbnych. Sierpniowy landing "Evidence Atelier" leży na osobnej gałęzi (`claude/loving-rhodes-2672c8`) i nie jest na `main`.
- **Tygodniowa kadencja dla wszystkich.** Dziś to przełącznik w kodzie dla jednego klienta. Gdy ma być ofertą, staje się kolumną przy kliencie i pozycją w planie.

## Znane ograniczenia

- Google AI to Gemini z Google Search, nie AI Overviews ani AI Mode w przeglądarce. Perplexity nie jest mierzony (jest tylko w imporcie z sierpnia).
- Pojedyncze pytanie zadawane jest 2 razy na asystenta, więc wynik jednego pytania to trop, nie wniosek. Wnioski stoją na typach pytań i na całości.
- Klasyfikacja źródeł (przewodnik, social, agregator) to lista wzorców dla Krakowa w `services/visibility.ts`. Dla innego miasta trzeba ją rozszerzyć.
- Dni liczone są w UTC, więc tydzień zaczyna się o 1:00 albo 2:00 czasu polskiego.
- Przy kilku krótkich, ogólnych pytaniach ("Kawiarnia w centrum Krakowa") Gemini potrafi dwa razy z rzędu odpowiedzieć z pamięci mimo instrukcji. Takie pytanie jest pytane ponownie w ramach zapasu prób; jeśli nadal się nie uda, raport zamyka się bez tej odpowiedzi i pokazuje ją jako brak, nie jako zero.

## Gdzie co jest

| Co | Plik |
| --- | --- |
| Pojedynczy pomiar (oba silniki) | `services/measurement.ts` |
| Kolejka raportów | `app/api/cron/measure/route.ts` |
| Model odczytu (serie, okresy, porównania) | `services/visibility.ts`, `services/visibility-share.ts` |
| Statystyka | `lib/stats-math.ts` |
| Wnioski | `services/insights.ts` |
| Podsumowanie słowne | `services/analyst.ts` |
| Ruch i boty | `services/stats.ts` |
| Okresy (tydzień ISO, miesiąc, dzień) | `lib/periods.ts` |
| Kto ma raport tygodniowy | `lib/weekly-reports.ts` |
