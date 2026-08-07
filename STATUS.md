# toodip, stan budowy

Dokument roboczy dla właściciela produktu. Po polsku, bo to notatka do planowania, a nie część kodu. Reszta repo jest po angielsku.

Stan na 5 sierpnia 2026.

**Legenda**

| Znacznik | Znaczy |
| --- | --- |
| ✅ Działa | Zbudowane i sprawdzone na prawdziwej bazie |
| 🟡 Częściowo | Działa, ale czegoś istotnego brakuje |
| ⬜ Makieta | Ekran istnieje, funkcji nie ma |
| ⬛ Planowane | Sama strona z opisem, zero mechaniki |

---

## Konto i dostęp

### Logowanie ✅
Adres e-mail i hasło, na Supabase Auth. Sesja odświeżana przy każdym żądaniu, niezalogowany ruch odbija się przed wyrenderowaniem czegokolwiek. Nie ma publicznej rejestracji: konta zakłada platforma.

**Co dalej:** reset hasła przez e-mail. Dziś klient, który zapomni hasła, musi napisać do Ciebie, a Ty wystawiasz nowe z panelu Supabase. Przy jednym kliencie to nieistotne, przy dziesięciu to codzienny telefon.

### Role i izolacja danych ✅
Trzy role: `platform_admin` (Ty), `tenant_admin` (właściciel lokalu), `tenant_member` (pracownik, pisze drafty, nie zatwierdza). Izolację wymusza baza przez polityki RLS, nie aplikacja. Każde zapytanie leci tokenem zalogowanego użytkownika.

**Co dalej:** nic pilnego. Warto kiedyś przetestować izolację na dwóch klientach naraz.

### Konto użytkownika ✅
Zmiana własnego hasła i nazwiska. To ta strona, o którą chodziło przy przekazywaniu hasła Filipowi.

**Co dalej:** nic.

### Klienci ✅
Ekran widoczny tylko dla Ciebie. Dodanie klienta zakłada workspace, konto właściciela i startowy profil biznesu naraz, i pokazuje raz hasło do przekazania. Przełączanie się między workspace'ami klientów.

**Co dalej:** edycja i usuwanie klienta z panelu, dziś to robota w SQL. Dodanie drugiego użytkownika do istniejącego workspace'u, na razie każdy lokal ma jedno konto.

---

## Praca z opiniami

### Ręczne dodawanie opinii ✅
Wklejasz treść, gwiazdki, źródło i imię. System od razu klasyfikuje.

**Co dalej:** automatyczny import z Google Business Profile. To jest największa pojedyncza rzecz do zrobienia w całym produkcie, bo dziś ktoś musi przepisywać opinie ręcznie.

### Klasyfikacja i flagi ryzyka ✅
Reguły, nie model. Ustala sentyment, wykrywa dziewięć rodzajów ryzyka (groźba prawna, higiena, zwrot pieniędzy, imię pracownika, konkurencja, wulgaryzmy, prawdopodobny fejk, skarga, niejasny sens) i decyduje, czy potrzebny jest człowiek. Działa po polsku i angielsku. Świadomie regułowe: bramka zatwierdzeń ma zachowywać się tak samo za każdym razem, także gdy model nie odpowiada.

**Co dalej:** dostroić słowniki na prawdziwych opiniach Twoich klientów. To robota na dane, nie na kod.

### Generowanie odpowiedzi 🟡
Pełny potok działa: trójwarstwowy prompt, generowanie, ocena jakości, zapis, audyt. Dziś jedzie na silniku regułowym offline, zero kosztu.

**Co dalej:** włączyć OpenAI. Kod providera jest gotowy i podpięty, brakuje tylko klucza w `.env.local` i `GENERATION_PROVIDER=openai`. Potem porównanie obu silników endpointem `/api/dev/compare-engines` i decyzja o modelu.

### Kontrola jakości draftów ✅
Każdy draft sprawdzany tymi samymi regułami niezależnie od silnika: czy odbija konkret z opinii, jedna fraza z banku maksimum, brak zakazanych zwrotów, brak zwrotów pieniędzy w publicznej odpowiedzi, brak imienia pracownika, emotki zgodne z polityką, kontakt prywatny przy negatywach.

**Co dalej:** nic. To jest gotowe i jest jednym z mocniejszych elementów produktu.

### Kolejka zatwierdzeń ✅
Wszystko, co polityka workspace'u kieruje do człowieka. Zatwierdzanie, odrzucanie z notatką, edycja draftu przed zatwierdzeniem.

**Co dalej:** przypisywanie opinii do konkretnej osoby. Mechanizm jest w kodzie, brakuje przycisku w interfejsie. Ma sens dopiero przy kliencie z kilkoma pracownikami.

### Publikacja 🟡
Oznacza odpowiedź jako opublikowaną, zapisuje treść i datę, podbija licznik użycia frazy.

**Co dalej:** faktyczna wysyłka do Google. Dziś ktoś musi skopiować odpowiedź i wkleić ją w profilu Google ręcznie. Razem z importem opinii to domyka pełną automatyzację.

---

## Konfiguracja i podgląd

### Ustawienia marki ✅
Ton, opisniki tonu, polityka emotek, podpis, zakazane zwroty, preferowane zwroty, czego nigdy nie wspominać, polityka negatywów, kontakt eskalacyjny, progi zatwierdzania, bank fraz z licznikami użycia, przykłady zatwierdzonych odpowiedzi.

**Co dalej:** nic. To wszystko trafia do promptu.

### Kreator setupu ✅
Cztery kroki dla nowego klienta: lokal, głos marki, polityka negatywów, progi zatwierdzania.

**Co dalej:** nic pilnego.

### Prompt studio ✅
Dokładny prompt stojący za dowolną opinią, warstwa po warstwie, wersjonowany. Plus dane wejściowe i szacowana liczba tokenów.

**Co dalej:** nic. Zacznie pokazywać realne zużycie tokenów, kiedy włączysz OpenAI.

### Log aktywności ✅
Kto dodał, wygenerował, edytował, zatwierdził, odrzucił i opublikował, ze znacznikiem czasu. Tylko do dopisywania, nic go nie kasuje.

**Co dalej:** nic.

### Dashboard ✅
Odsetek odpowiedzi, średni czas odpowiedzi, oczekujące zatwierdzenia, rozkład sentymentu i ocen, kolejka według ryzyka, ostatnia aktywność.

**Co dalej:** nic.

---

## Zespół i pieniądze

### Zespół 🟡
Lista osób w workspace i tabela uprawnień per rola.

**Co dalej:** zapraszanie ludzi i zmiana ról z panelu. Dziś dodanie drugiej osoby do lokalu to robota w SQL.

### Billing ⬜
Ekran z planami i licznikiem zużycia. Liczby są prawdziwe, płatności nie ma.

**Co dalej:** podpiąć operatora płatności i powiązać plan z limitami. Do zrobienia dopiero, gdy będzie kilku płacących klientów.

---

## Moduły przyszłe ⬛

Wszystkie cztery to strony opisujące, co zrobią i z czego skorzystają. Zero mechaniki, ale też zero martwych linków.

**Visibility hub.** Jak często asystenci i wyszukiwarki wymieniają lokal przy pytaniach, które zadają jego klienci. Potrzebuje tabel na pomiary, harmonogramu i adapterów per silnik.

**Social content agent.** Posty z zatwierdzonych odpowiedzi i zdjęć gości, na tych samych zasadach marki. Potrzebuje magazynu na media i integracji z publikowaniem.

**Competitors.** Porównanie oceny, tempa opinii i szybkości odpowiedzi z lokalami z tej samej ulicy. Potrzebuje źródła danych o miejscach.

**Reports.** Miesięczny dokument dla klienta, white label dla agencji. Potrzebuje generatora PDF i wysyłki.

---

## Infrastruktura

| Element | Stan | Co dalej |
| --- | --- | --- |
| Baza i RLS | ✅ | Nic. Migracje w `supabase/migrations` |
| Repo i Git | ✅ | Nic |
| Deploy na Vercel | 🟡 | Build przechodzi lokalnie, produkcja jeszcze nie wystartowała. Do sprawdzenia zakładka Deployments |
| Zmienne na Vercelu | 🟡 | Dodane, do potwierdzenia po pierwszym zielonym buildzie |
| Domena | ⬛ | Do podpięcia po uruchomieniu produkcji |
| Limit generowań | ✅ | Hamulec na pętlę, prawdziwy sufit to limit budżetu w OpenAI |

---

## Droga do samoobsługi

Cel: klient wchodzi na stronę, kupuje jedną usługę za paywallem, podpina swoje konto Google w panelu, opinie same się zaciągają, on klika publikuj. Bez kontaktu z Tobą na żadnym etapie.

To jest wykonalne i architektura już na to pracuje. Wymaga jednak **dwóch osobnych zgód od Google**, nie jednej.

**Zgoda pierwsza, lista dopuszczonych.** Jednorazowa, dotyczy NotASlop jako dewelopera. To tutaj potrzebna jest rola menedżera na jednej wizytówce klienta, raz, żeby udowodnić, że firma jest prawdziwa. Po przyznaniu nikt już nikogo nigdzie nie dodaje.

**Zgoda druga, weryfikacja ekranu zgody OAuth.** O tej łatwo zapomnieć, a bez niej nie da się otworzyć produktu publicznie. Niezweryfikowana aplikacja ma limit 100 użytkowników i pokazuje ostrzeżenie „Google nie zweryfikowało tej aplikacji", które za paywallem zabija konwersję. Do weryfikacji potrzeba polityki prywatności, regulaminu, potwierdzonej własności domeny, nagrania pokazującego przepływ i uzasadnienia zakresu. Trwa tygodniami.

Zakres `business.manage` jest wrażliwy, a nie zastrzeżony, więc weryfikacja tak, ale bez corocznego płatnego audytu bezpieczeństwa u zewnętrznego audytora. **Potwierdź to w Google Cloud Console**, która przy dodawaniu zakresu sama pokazuje jego kategorię. Różnica między wrażliwym a zastrzeżonym to różnica kilkudziesięciu tysięcy złotych rocznie, więc sprawdź zanim zaplanujesz budżet.

**Co już jest gotowe pod ten model**

- Wielodostępność od pierwszej tabeli, każdy klient ma własne wszystko
- Tabela `review_sources` czeka pusta, z polami `connected` i `last_synced_at`
- Publikacja jest osobną akcją, więc podmiana ręcznego oznaczania na wysyłkę do Google to jedno miejsce w kodzie
- Prompt składany per lokal działa

**Czego brakuje**

- Ekran łączenia konta Google, przechowywanie i odświeżanie tokenów
- Zadanie importujące opinie cyklicznie
- Publikacja przez API zamiast ręcznego skoku
- Paywall i samodzielna rejestracja, dziś konta zakłada wyłącznie platforma
- Polityka prywatności i regulamin, potrzebne i tak do weryfikacji OAuth

**Kolejność, która nie marnuje czasu**

1. Teraz: rola menedżera na wizytówce Bruka albo Filipa, wniosek o listę dopuszczonych
2. W czasie oczekiwania: budowa łączenia konta, importu i publikacji
3. Potem: polityka prywatności, regulamin, nagranie, weryfikacja OAuth
4. Potem: paywall i samodzielna rejestracja
5. Otwarcie

Do 100 użytkowników można działać przed weryfikacją OAuth. Przy pierwszych kilku płacących klientach to zapas, którego nie wyczerpiesz. Weryfikację trzeba zacząć zanim zaczniesz skalować, a nie zanim zaczniesz sprzedawać.

---

## Trzy rzeczy, które zmieniłyby najwięcej

1. **Import opinii z Google.** Dopóki go nie ma, ktoś przepisuje opinie ręcznie i cała oszczędność czasu jest połowiczna.
2. **Włączenie OpenAI.** Silnik regułowy pilnuje higieny odpowiedzi, ale nie napisze zdania, które brzmi jak żywy człowiek. To jedno popołudnie pracy.
3. **Reset hasła przez e-mail.** Drobiazg, który przy kilku klientach zamienia się w stały telefon do Ciebie.
