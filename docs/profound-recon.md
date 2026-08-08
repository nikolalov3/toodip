# Rekonesans Profound, wnioski i decyzje

Notatka robocza po analizie Profound od środka, na workspace Bruk Cafe.
Daty pomiarów: 7-8 sierpnia 2026. Dane źródłowe: eksporty JSON w księdze
pomiarów (tabele `visibility_*`, source `profound`).

Po polsku, bo to dokument decyzyjny właściciela, nie część kodu.

---

## Jak Profound mierzy i gdzie to pęka

**Mechanika:** tematy (grupy promptów) → prompty → jedno wykonanie promptu na
platformę dziennie → parsowanie wzmianek i cytowań → procenty.

Na workspace Bruka: 8-9 tematów, 36 promptów, 3 platformy (ChatGPT, Google AI
Overviews, Perplexity), ~120-150 odpowiedzi dziennie.

**Gdzie to pęka, po kolei:**

1. **n=1 na prompt na platformę.** Zero powtórzeń tego samego pytania. Cała
   zmienność odpowiedzi modelu, czyli sedno trudności pomiaru AI, jest
   niezmierzona. Dzienne wykresy to szum próbkowania podany jako trend.
2. **Nagłówek miesza brandowe z kategorialnym.** Bruk miał „Visibility Score
   17,5%, #1", bo temat „Bruk Cafe vs Competitors" (tautologia: pytasz o
   Bruk, dostajesz Bruk) uśrednia się z ośmioma tematami, w których Bruk ma
   zero. Metryka komfortu.
3. **Brak rozdzielczości encji.** „Krusz" i „KRUSZ" jako dwie marki, Green
   Caffè Nero w trzech pisowniach na dwóch pozycjach tej samej tabeli,
   E. Wedel jako konkurent kawiarni specialty.
4. **Uniwersum promptów z automatu, bez przeglądu.** Prompt o Warszawie dla
   lokalu z Krakowa (wciągnął 6% szumu cytowań), prompty „w moim mieście"
   bez ugruntowania, jedyny w pełni polski temat próbkowany 5x rzadziej.
5. **Werdykty bez progu próbki.** Chipy „Wymaga poprawy" na 12-15
   odpowiedziach, delty pokazywane pierwszego dnia względem niczego.

**Dowód niestabilności:** dwa eksporty tego samego dnia, kilka godzin różnicy
(123 vs 147 odpowiedzi): połowa tabeli laptop-friendly wymieniła skład,
Blossom spadł z 41,67% na 25%. W rzeczywistości nie zmieniło się nic.

**Co jest u nich dobre i co adoptujemy:** temat jako jednostka analizy,
tabele „kto posiada intencję", rozdzielenie wzmianek od cytowań, eksport
surowych odpowiedzi, chipy werdyktów (u nas dopiero od progu próbki),
rozróżnienie Score vs Rank, diagnostyka „trzech bramek" (niżej).

---

## Skąd Profound ma te dane i czemu my ich (jeszcze) nie mamy

Nie ma tu żadnej magii ani specjalnego dostępu:

- **Odpowiedzi modeli:** sami wykonują prompty. ChatGPT i Perplexity mają
  publiczne API. Google AI Overviews nie ma API, więc pozyskuje się je przez
  dostawców SERP (SerpAPI, DataForSEO itp.), co kosztuje, ale jest dostępne
  dla każdego.
- **Parsowanie wzmianek i cytowań:** własny kod, dokładnie to, co robi nasz
  skrypt importu.
- **„Wolumeny promptów"** (co ludzie pytają AI): kupowane panele clickstream.
  To jedyna rzecz realnie droga i enterprise'owa. Dla lokali zbędna: intencje
  kawiarni zna się z kategorii i z opinii, nie z panelu za setki tysięcy.

Wniosek: oś ChatGPT mamy na wyciągnięcie ręki (klucz OpenAI), Perplexity ma
tanie API, AIO wymaga dostawcy SERP za rozsądne pieniądze. Nasza bateria
będzie mniejsza i głębsza: mniej promptów, więcej powtórzeń, miesięcznie.

---

## Mapa cytowań krakowskiej gastronomii (108 odpowiedzi, 819 cytowań)

Średnio 7,6 cytowania na odpowiedź.

| Kategoria | Udział | Najwięksi |
| --- | --- | --- |
| Blogi i przewodniki | 21% | kukbuk.pl (38), krakowfood.pl (15), gojammin (15), krakow.com (12) |
| Social | 16% | Instagram (71, największa domena zbioru), Facebook (56) |
| Google (mapy/profil) | 8% | niemal całość cytowań AI Overviews |
| Agregatory podróżnicze | 2% | TripAdvisor, Wanderlog |
| Reddit | 1% | dziewięć cytowań |
| Długi ogon | ~51% | w tym strony własne lokali |

**Strony własne lokali bywają cytowane** (ambalaz.pl 16, coffeedesk.pl 20,
nawet strona z kreatora Localo 8), głównie przez Perplexity. bruk.cafe: 0,
także przy pytaniach brandowych. To stan do naprawienia, nie prawo natury.

**Diety platform są rozłączne:**

- **Google AI Overviews** je wizytówkę Google (44% cytowań to google.com)
- **Perplexity** je Instagram, Facebooka, blogi i strony lokali
- **ChatGPT** je anglojęzyczne przewodniki z indeksu Binga (krakow.com,
  wanderlog, krakowcitybreaks) plus szczyptę Reddita

**Diagnostyka platformowa:** profil widoczności lokalu per platforma mówi,
gdzie mieszka jego dokumentacja. Widoczny tylko w AIO = dobra wizytówka,
martwy social. Tylko w Perplexity = żyje z Instagrama, wizytówka leży.
Nigdzie w ChatGPT = nie istnieje w anglojęzycznych przewodnikach. To zamienia
pomiar w receptę i jest wbudowane w moduł Visibility.

---

## Reguły naszego pomiaru (wynikające wprost z powyższego)

1. **Brandowe nigdy nie miesza się z kategorialnym.** Flaga `is_branded` na
   intencji, nagłówek liczony wyłącznie z kategorialnych.
2. **Powtórzenia zamiast rozstrzału.** Mniej promptów, każdy wielokrotnie,
   kadencja miesięczna. Raportujemy rozkład, nie pojedynczy strzał.
3. **Jedynki i zera.** Przy małych próbkach stabilni są tylko liderzy
   intencji i nieobecni. Kolejność miejsc 3-10 to szum i tak ją traktujemy.
4. **Encje kleimy do kanonicznego rejestru miejsc.** Lokalność to przewaga
   jakości danych, której globalny gracz tanio nie odtworzy.
5. **Wzmianki i cytowania to osobne księgi.** Cytowania agregujemy miejsko:
   to jest mapa powierzchni, nie tylko udział domeny klienta.
6. **Każda zmiana jest interwencją z datą.** Ruch wyniku bez zapisanej
   interwencji to pogoda, nie postęp. Opublikowana odpowiedź na opinię
   loguje się sama.

## Trzy bramki (adoptowane z ich szkoleń, przetłumaczone na lokal)

- **Bramka 1:** żadne źródło nie mówi o Tobie tego, o co pyta klient
  (problem udokumentowania). Tu siedzi Bruk prawie wszędzie.
- **Bramka 2:** zdanie istnieje, ale nie na powierzchniach, które AI cytuje
  (problem powierzchni).
- **Bramka 3:** jesteś na cytowanej powierzchni, ale w formie, z której nie
  da się Cię wyjąć (problem struktury).

Ich doktryna „twórz treści porównawcze" zastosowana do lokalu wskazuje poza
stronę lokalu: treść porównawcza strukturalnie należy do niezależnego
przewodnika. To jest uzasadnienie bitekrakow ich własnymi słowami.

---

## Punkt zerowy Bruka (7-8 sierpnia 2026)

- 1 wzmianka kategorialna na ~100 odpowiedzi (temat Kleparz), reszta zera
- bruk.cafe: zero cytowań, również przy pytaniach brandowych
- Właściciele intencji: Tociekawa (kawa), Psikawka (dog-friendly), Blossom
  (śniadania), Green Caffè Nero (laptop, sieciówka wygrywająca walkowerem),
  Aura (Kleparz), Starbucks (plant-based)
- Cel kwartału: stabilna obecność w „praca z laptopem, centrum/Kleparz",
  wyjście z zera w AIO (wizytówka) i Perplexity (Instagram + strona)

Plan naprawczy per platforma: patrz rozdział o dietach platform. Kolejność
oczekiwanego ruchu: najpierw AIO (tygodnie), potem Perplexity, na końcu
ChatGPT (kwartał+).
