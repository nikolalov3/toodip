# Widoczność w AI: jak czytać ten ekran

Przewodnik do czytania z panelem obok. Kolejność jak na ekranie, od góry do dołu. Stan na 12 października 2026.

## Skąd biorą się dane

Jeden pomiar = jedno pytanie klienta zadane jednemu asystentowi AI z włączonym wyszukiwaniem w sieci. toodip zapisuje pełną odpowiedź, wyciąga z niej nazwy lokali (DeepSeek) i zapisuje źródła, z których asystent korzystał. Nic nie jest szacowane: każda liczba na ekranie wynika z policzenia tych zapisanych odpowiedzi.

Silnik: dziś GPT-4o mini z wyszukiwaniem online przez OpenRouter (zapisywany jako platforma ChatGPT). Perplexity i Google AI można dołożyć jako osobne silniki, każdy daje osobny wiersz w tabelach poniżej.

Pytania "brandowe" (takie, w których pada nazwa lokalu, np. "Czy Café Belmont ma ogródek?") są oznaczone osobno i nigdy nie wchodzą do wyniku. Inaczej każdy miałby 100%.

## Góra ekranu: wynik i następny krok

**AI VISIBILITY SCORE**, np. 13%. To udział odpowiedzi, w których asystent wymienił Twój lokal, we wszystkich odpowiedziach z ostatniego dnia pomiaru. 13 ze 102 odpowiedzi = 13%. Pod spodem data pomiaru i liczba pytań.

Obok wyniku **delta**: różnica w punktach procentowych względem poprzedniego dnia pomiaru. Przy pierwszym pomiarze jest napis "First measurement, this is your baseline". Po czwartkowym pomiarze Belmont pojawi się tu np. "+4 pts vs 30 Aug".

**RECOMMENDED NEXT STEP**: toodip wybiera platformę, na której wynik jest najsłabszy, i podaje jedną czynność dopasowaną do tego, co ta platforma czyta:

- ChatGPT czyta Bing i anglojęzyczne przewodniki, więc rada to wpis w listach typu Wanderlog i przewodnikach po mieście.
- Google AI Overviews czyta Wizytówkę Google, więc rada to atrybuty, zdjęcia, pytania i odpowiedzi, odpowiedzi na opinie.
- Perplexity czyta Instagram, Facebook i strony lokali, więc rada to regularne posty i treść na własnej stronie.

## Panel "Run a measurement"

To miejsce, gdzie się mierzy. Dwa tryby.

**Tryb konfiguracji** (gdy lokal nie ma jeszcze pytań, albo po kliknięciu "Edit questions"):

- **Generate with AI**: DeepSeek pisze zestaw pytań z profilu lokalu (kategoria, miasto, dzielnica, języki) i opcjonalnie z treści strony www. Domyślnie 50 pytań, do wyboru 30/50/80. Można kliknąć "Regenerate".
- **Import CSV**: własny plik, jedno pytanie na linię, opcjonalne kolumny intent, language, branded. Duplikaty i bardzo krótkie linie są pomijane.
- **Add question**: pusty wiersz do ręcznego wpisania.
- Każdy wiersz ma: treść pytania, intencję (grupa, np. "Matcha w Krakowie"), język (pl/en) i checkbox "branded".
- **Save N questions**: zapis. Przy edycji istniejącej baterii pytania usunięte z listy przestają być zadawane, ale ich dotychczasowe pomiary zostają w historii.

**Tryb pomiaru** (gdy bateria istnieje):

- Chipy z intencjami: kliknięcie wyłącza lub włącza grupę pytań z tego uruchomienia. Brandowe są domyślnie wyłączone.
- **Repetitions per question**: ile razy zadać każde pytanie. Domyślnie 2, bo asystenci odpowiadają losowo i jedno zadanie to za mało. Raport miesięczny w planie Visibility to 50 pytań × 2 = 100 pomiarów.
- Linia z szacunkiem: liczba pomiarów, koszt (ok. 0,8 centa za pomiar), czas, zużycie limitu w tym miesiącu.
- **Run N executions**: uruchamia pomiary z przeglądarki, jeden po drugim, z paskiem postępu i przyciskiem Stop. Każdy pomiar najpierw rezerwuje miejsce w limicie planu i w dziennym budżecie platformy, dopiero potem wydaje pieniądze.

Pomiary z przeglądarki i pomiary z automatu (cron, raz w miesiącu) zapisują się identycznie i sumują na tym samym ekranie.

## Sekcja 1. Am I visible?

Cztery standardowe metryki widoczności w AI (te same, które pokazują Profound czy Adobe):

- **Brand mentions**: w ilu odpowiedziach pada Twoja nazwa. To jest wynik z góry ekranu.
- **Share of voice**: Twój udział we wszystkich wymienionych lokalach. Jeśli asystent w 102 odpowiedziach wymienił 180 lokali, a Ciebie 13 razy, to 7%. Obok pozycja w rankingu, np. #9 z 15.
- **Citation rate**: w ilu odpowiedziach asystent cytował Twoją stronę albo Twoje profile społecznościowe jako źródło. 0% znaczy, że AI opisuje Cię z cudzych stron.
- **AI referral traffic**: ilu ludzi faktycznie weszło na stronę z asystentów. Dane biorą się z modułu Ruch z AI (skrypt na stronie). Dziś pokazuje kreskę, podłączam po czwartku.

Pod kafelkami wykres trendu: pojawia się od drugiego dnia pomiaru. Belmont ma dziś jeden punkt (30 sierpnia), w czwartek pojawi się drugi.

## Sekcja 2. Who is taking my spot?

Lokale, które asystenci wymieniają na te same pytania, posortowane po udziale w odpowiedziach. To realna konkurencja w AI, często inna niż w Google. "32% of answers" przy Karma Coffee znaczy: w co trzeciej odpowiedzi pada ta nazwa. Twój lokal jest podświetlony.

## Sekcja 3. Where exactly am I missing?

Tabela intencji, czyli typów pytań. Dla każdej platformy status:

- **Absent**: asystent nigdy Cię tu nie wymienia.
- **Flickering**: czasem tak, czasem nie (to właśnie dlatego pytania zadajemy dwa razy).
- **Present**: wymienia niezawodnie.

To najbardziej praktyczna tabela: pokazuje, o jakie pytania warto walczyć. Belmont jest "Present" w matchy, "Absent" w kawie specialty.

## Sekcja 4. What are the AIs reading?

Źródła, z których asystenci budują odpowiedzi, pogrupowane: Google, Social, Reddit, agregatory podróżnicze, przewodniki i blogi, inne i strony lokali. Przy każdej domenie liczba cytowań. Jeśli Twojej domeny nie ma na liście, asystent nie ma czym Cię polecić. Tu widać, gdzie trzeba "być", żeby AI Cię znalazło.

## Sekcja 5. What do I do about it?

Trzy karty, po jednej na platformę, każda z jedną czynnością i wyjaśnieniem "Why" (co ta platforma czyta). Najsłabsza platforma ma znacznik "Start here". To ta sama logika, co "Recommended next step" na górze, tylko rozpisana dla wszystkich platform.

## Sekcja 6. What have I changed so far?

Dziennik zmian (Change log). Każda zapisana interwencja ma datę, więc gdy wynik się ruszy, widać, co zostało zrobione tydzień wcześniej. Dziś wpisy pochodzą z dawnego modułu odpowiedzi na opinie; w nowym panelu dojdzie ręczne dopisywanie ("dodałem zdjęcia do wizytówki", "wpis w przewodniku").

## Na dole: Measurement details (zwinięte)

- **Questions asked**: każde pytanie z baterii, gdzie było zadane i czy lokal się pojawił.
- **Raw answers**: pełne odpowiedzi asystentów, te z Twoją nazwą na górze. To dowód: klient może przeczytać dokładnie to, co "powiedziało" AI.

## Co dzieje się automatycznie w tle

- Raz w miesiącu każdy klient z planem pomiarowym dostaje zadanie: cała bateria × 2. Kolejka obsługuje klientów po kawałku, uczciwie, kilka pomiarów na przebieg, więc nikt nie czeka na innych.
- Awaria dostawcy AI wstrzymuje zadanie, nie psuje raportu. Brak baterii też tylko wstrzymuje.
- Limity: plan Visibility to 100 pomiarów miesięcznie, a cała platforma ma dzienny budżet (domyślnie 25 $). Oba są rezerwowane atomowo, więc równoległe kliknięcia nie przeskoczą limitu.
- Belmont: zadanie październikowe czeka na czwartek 15.10, 04:00 UTC. Wtedy wykona 34 × 2 = 68 pomiarów (ok. 0,60 $) i wynik pojawi się na tym ekranie z deltą względem 30 sierpnia.
