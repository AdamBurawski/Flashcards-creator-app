# Dokument wymagań produktu (PRD) – flashcards-creator-app

## 1. Przegląd produktu

Projekt flashcards-creator-app ma na celu umożliwienie użytkownikom szybkiego tworzenia i zarządzania zestawami fiszek edukacyjnych. Aplikacja wykorzystuje modele LLM (poprzez API) do generowania sugestii fiszek na podstawie dostarczonego tekstu.

## 2. Problem użytkownika

Manualne tworzenie wysokiej jakości fiszek wymaga dużych nakładów czasu i wysiłku, co zniechęca do korzystania z efektywnej metody nauki, jaką jest spaced repetition. Celem rozwiązania jest skrócenie czasu potrzebnego na tworzenie odpowiednich pytań i odpowiedzi oraz uproszczenie procesu zarządzania materiałem do nauki.

## 3. Wymagania funkcjonalne

1. Automatyczne generowanie fiszek:

   - Użytkownik wkleja dowolny tekst (np. fragment podręcznika).
   - Aplikacja wysyła tekst do modelu LLM za pośrednictwem API.
   - Model LLM proponuje zestaw fiszek (pytania i odpowiedzi).
   - Fiszki są przedstawiane użytkownikowi w formie listy z możliwością akceptacji, edycji lub odrzucenia.

2. Ręczne tworzenie i zarządzanie fiszkami:

   - Formularz do ręcznego tworzenia fiszek (przód i tył fiszki).
   - Opcje edycji i usuwania istniejących fiszek.
   - Ręczne tworzenie i wyświetlanie w ramach widoku listy "Moje fiszki"

3. Podstawowy system uwierzytelniania i kont użytkowników:

   - Rejestracja i logowanie.
   - Możliwość usunięcia konta i powiązanych fiszek na życzenie.

4. Integracja z algorytmem powtórek:

   - Zapewnienie mechanizmu przypisywania fiszek do harmonogramu powtórek (korzystanie z gotowego algorytmu).
   - Brak dodatkowych metadanych i zaawansowanych funkcji powiadomień w MVP.

5. Przechowywanie i skalowalność:

   - Dane o fiszkach i użytkownikach przechowywane w sposób zapewniający skalowalność i bezpieczeństwo.

6. Statystyki generowania fiszek:

   - Zbieranie informacji o tym, ile fiszek zostało wygenerowanych przez AI i ile z nich ostatecznie zaakceptowano.

7. Wymagania prawne i ograniczenia:
   - Dane osobowe użytkowników i fiszek przechowywane zgodnie z RODO.
   - Prawo do wglądu i usunięcia danych (konto wraz z fiszkami) na wniosek użytkownika.

## 4. Granice produktu

1. Poza zakresem MVP:
   - Zaawansowany, własny algorytm powtórek (korzystamy z gotowego rozwiązania, biblioteki open-source).
   - Mechanizmy gamifikacji.
   - Aplikacje mobilne (obecnie tylko wersja web).
   - Import wielu formatów dokumentów (PDF, DOCX itp.).
   - Publicznie dostępne API.
   - Współdzielenie fiszek między użytkownikami.
   - Rozbudowany system powiadomień.
   - Zaawansowane wyszukiwanie fiszek po słowach kluczowych.

## 5. Kolekcje reguł

- Tytuł: Kolekcje reguł
- Opis: Jako użytkownik chcę móc zapisywać i edytować zestawy reguł, aby szybko wykorzystywać sprawdzone rozwiązania w różnych projektach.
- Kryteria akceptacji:
  - Użytkownik może zapisać aktualny zestaw reguł (US-001) jako kolekcję (nazwa, opis, reguły).
  - Użytkownik może aktualizować kolekcję.
  - Użytkownik może usunąć kolekcję.
  - Użytkownik może przywrócić kolekcję do poprzedniej wersji (pending changes).
  - Funkcjonalność kolekcji nie jest dostępna bez logowania się do systemu (US-004).

## 6. Bezpieczny dostęp i uwierzytelnianie

- Tytuł: Bezpieczny dostęp
- Opis: Jako użytkownik chcę mieć możliwość rejestracji i logowania się do systemu w sposób zapewniający bezpieczeństwo moich danych.
- Kryteria akceptacji:
  - Logowanie i rejestracja odbywają się na dedykowanych stronach.
  - Logowanie wymaga podania adresu email i hasła.
  - Rejestracja wymaga podania adresu email, hasła i potwierdzenia hasła.
  - Użytkownik MOŻE korzystać z tworzenia reguł "ad-hoc" bez logowania się do systemu (US-001).
  - Użytkownik NIE MOŻE korzystać z funkcji Kolekcji bez logowania się do systemu (US-003).
  - Użytkownik może logować się do systemu poprzez przycisk w prawym górnym rogu.
  - Użytkownik może się wylogować z systemu poprzez przycisk w prawym górnym rogu w głównym @Layout.astro.
  - Nie korzystamy z zewnętrznych serwisów logowania (np. Google, GitHub).
  - Odzyskiwanie hasła powinno być możliwe.

## 7. Historyjki użytkowników

ID: US-001
Tytuł: Rejestracja konta
Opis: Jako nowy użytkownik chcę się zarejestrować, aby mieć dostęp do własnych fiszek i móc korzystać z generowania fiszek przez AI.
Kryteria akceptacji:

- Formularz rejestracyjny zawiera pola na adres e-mail i hasło.
- Po poprawnym wypełnieniu formularza i weryfikacji danych konto jest aktywowane.
- Użytkownik otrzymuje potwierdzenie pomyślnej rejestracji i zostaje zalogowany.

ID: US-002
Tytuł: Logowanie do aplikacji
Opis: Jako zarejestrowany użytkownik chcę móc się zalogować, aby mieć dostęp do moich fiszek i historii generowania.
Kryteria akceptacji:

- Po podaniu prawidłowych danych logowania użytkownik zostaje przekierowany do widoku generowania fiszek.
- Błędne dane logowania wyświetlają komunikat o nieprawidłowych danych.
- Dane dotyczące logowania przechowywane są w bezpieczny sposób.

ID: US-003
Tytuł: Generowanie fiszek przy użyciu AI
Opis: Jako zalogowany użytkownik chcę wkleić kawałek tekstu i za pomocą przycisku wygenerować propozycje fiszek, aby zaoszczędzić czas na ręcznym tworzeniu pytań i odpowiedzi.
Kryteria akceptacji:

- W widoku generowania fiszek znajduje się pole tekstowe, w którym użytkownik może wkleić swój tekst.
- Pole tekstowe oczekuje od 1000 do 10 000 znaków.
- Po kliknięciu przycisku generowania aplikacja komunikuje się z API modelu LLM i wyświetla listę wygenerowanych propozycji fiszek do akceptacji przez użytkownika.
- W przypadku problemów z API lub braku odpowiedzi modelu użytkownik zobaczy stosowny komunikat o błędzie.

ID: US-004
Tytuł: Przegląd i zatwierdzanie propozycji fiszek
Opis: Jako zalogowany użytkownik chcę móc przeglądać wygenerowane fiszki i decydować, które z nich chcę dodać do mojego zestawu, aby zachować tylko przydatne pytania i odpowiedzi.
Kryteria akceptacji:

- Lista wygenerowanych fiszek jest wyświetlana pod formularzem generowania.
- Przy każdej fiszce znajduje się przycisk pozwalający na jej zatwierdzenie, edycję lub odrzucenie.
- Po zatwierdzeniu wybranych fiszek użytkownik może kliknąć przycisk zapisu i dodać je do bazy danych.

ID: US-005
Tytuł: Edycja fiszek utworzonych ręcznie i generowanych przez AI
Opis: Jako zalogowany użytkownik chcę edytować stworzone lub wygenerowane fiszki, aby poprawić ewentualne błędy lub dostosować pytania i odpowiedzi do własnych potrzeb.
Kryteria akceptacji:

- Istnieje lista zapisanych fiszek (zarówno ręcznie tworzonych, jak i zatwierdzonych wygenerowanych).
- Każdą fiszkę można kliknąć i wejść w tryb edycji.
- Zmiany są zapisywane w bazie danych po zatwierdzeniu.

ID: US-006
Tytuł: Usuwanie fiszek
Opis: Jako zalogowany użytkownik chcę usuwać zbędne fiszki, aby zachować porządek w moim zestawie.
Kryteria akceptacji:

- Przy każdej fiszce na liście (w widoku "Moje fiszki") widoczna jest opcja usunięcia.
- Po wybraniu usuwania użytkownik musi potwierdzić operację, zanim fiszka zostanie trwale usunięta.
- Fiszki zostają trwale usunięte z bazy danych po potwierdzeniu.

ID: US-007
Tytuł: Ręczne tworzenie fiszek
Opis: Jako zalogowany użytkownik chcę ręcznie stworzyć fiszkę (określając przód i tył fiszki), aby dodawać własny materiał, który nie pochodzi z automatycznie generowanych treści.
Kryteria akceptacji:

- W widoku "Moje fiszki" znajduje się przycisk dodania nowej fiszki.
- Naciśnięcie przycisku otwiera formularz z polami "Przód" i "Tył".
- Po zapisaniu nowa fiszka pojawia się na liście.

ID: US-008
Tytuł: Sesja nauki z algorytmem powtórek
Opis: Jako zalogowany użytkownik chcę, aby dodane fiszki były dostępne w widoku "Sesja nauki" opartym na zewnętrznym algorytmie, aby móc efektywnie się uczyć (spaced repetition).
Kryteria akceptacji:

- W widoku "Sesja nauki" algorytm przygotowuje dla mnie sesję nauki fiszek
- Na start wyświetlany jest przód fiszki, poprzez interakcję użytkownik wyświetla jej tył
- Użytkownik ocenia zgodnie z oczekiwaniami algorytmu na ile przyswoił fiszkę
- Następnie algorytm pokazuje kolejną fiszkę w ramach sesji nauki

ID: US-009
Tytuł: Bezpieczny dostęp i autoryzacja
Opis: Jako zalogowany użytkownik chcę mieć pewność, że moje fiszki nie są dostępne dla innych użytkowników, aby zachować prywatność i bezpieczeństwo danych.
Kryteria akceptacji:

- Tylko zalogowany użytkownik może wyświetlać, edytować i usuwać swoje fiszki.
- Nie ma dostępu do fiszek innych użytkowników ani możliwości współdzielenia.

ID: US-010
Tytuł: Zapisywanie zestawu reguł jako kolekcji
Opis: Jako zalogowany użytkownik chcę zapisać aktualny zestaw reguł jako kolekcję, aby móc wielokrotnie korzystać z tych samych ustawień.
Kryteria akceptacji:

- Użytkownik może nadać nazwę i opis zapisywanej kolekcji.
- Kolekcja zapisuje wszystkie bieżące reguły w formie umożliwiającej ich późniejsze przywrócenie.
- Po zapisaniu kolekcja pojawia się na liście dostępnych kolekcji użytkownika.

ID: US-011
Tytuł: Aktualizacja kolekcji reguł
Opis: Jako zalogowany użytkownik chcę aktualizować istniejącą kolekcję reguł, aby dostosować ją do zmieniających się potrzeb.
Kryteria akceptacji:

- Użytkownik może wybrać kolekcję do aktualizacji z listy dostępnych kolekcji.
- System umożliwia modyfikację nazwy, opisu i zawartości kolekcji.
- Po zatwierdzeniu zmiany są natychmiast zapisywane i zastępują poprzednią wersję.

ID: US-012
Tytuł: Usuwanie kolekcji reguł
Opis: Jako zalogowany użytkownik chcę usunąć niepotrzebne kolekcje reguł, aby utrzymać porządek w swoich zasobach.
Kryteria akceptacji:

- Przy każdej kolekcji na liście widoczna jest opcja usunięcia.
- System wymaga potwierdzenia przed trwałym usunięciem kolekcji.
- Po usunięciu kolekcja znika z listy i nie jest już dostępna dla użytkownika.

ID: US-013
Tytuł: Przywracanie poprzedniej wersji kolekcji
Opis: Jako zalogowany użytkownik chcę przywrócić poprzednią wersję kolekcji, aby cofnąć niepożądane zmiany.
Kryteria akceptacji:

- System przechowuje historię zmian każdej kolekcji.
- Użytkownik może przeglądać listę poprzednich wersji kolekcji.
- Po wybraniu wersji system przywraca kolekcję do stanu z wybranego momentu.

ID: US-014
Tytuł: Ograniczenie dostępu do kolekcji dla zalogowanych użytkowników
Opis: Jako administrator systemu chcę, aby funkcja kolekcji była dostępna tylko dla zalogowanych użytkowników, aby zapewnić właściwą personalizację i bezpieczeństwo.
Kryteria akceptacji:

- Próba dostępu do funkcji kolekcji bez zalogowania przekierowuje użytkownika do strony logowania.
- System wyświetla odpowiedni komunikat informujący o konieczności zalogowania się.
- Po zalogowaniu użytkownik jest automatycznie przekierowywany do wcześniej wybranej funkcji kolekcji.

ID: US-015
Tytuł: Dedykowane strony logowania i rejestracji
Opis: Jako użytkownik chcę mieć dostęp do oddzielnych, dedykowanych stron logowania i rejestracji, aby proces uwierzytelniania był przejrzysty i intuicyjny.
Kryteria akceptacji:

- Strony logowania i rejestracji są dostępne z menu głównego oraz z odpowiednich przycisków w interfejsie.
- Każda strona posiada jasny tytuł i instrukcje dla użytkownika.
- Ze strony logowania można przejść do strony rejestracji i odwrotnie.

ID: US-016
Tytuł: Logowanie za pomocą emaila i hasła
Opis: Jako zarejestrowany użytkownik chcę logować się do systemu za pomocą mojego adresu email i hasła, aby mieć pewność, że tylko ja mam dostęp do mojego konta.
Kryteria akceptacji:

- Formularz logowania zawiera pola na adres email i hasło.
- System weryfikuje poprawność wprowadzonych danych.
- W przypadku błędnych danych system wyświetla odpowiedni komunikat bez wskazywania, które pole zawiera błąd.

ID: US-017
Tytuł: Rejestracja konta w systemie
Opis: Jako nowy użytkownik chcę zarejestrować konto w systemie podając email, hasło i jego potwierdzenie, aby utworzyć nowe konto w bezpieczny sposób.
Kryteria akceptacji:

- Formularz rejestracji zawiera pola na adres email, hasło i potwierdzenie hasła.
- System weryfikuje, czy hasło i jego potwierdzenie są identyczne.
- System sprawdza, czy podany adres email nie jest już używany przez inne konto.

ID: US-018
Tytuł: Tworzenie reguł bez logowania
Opis: Jako użytkownik niezalogowany chcę tworzyć reguły "ad-hoc", aby móc korzystać z podstawowej funkcjonalności systemu bez konieczności zakładania konta.
Kryteria akceptacji:

- Niezalogowany użytkownik ma dostęp do interfejsu tworzenia reguł.
- System informuje o ograniczeniach funkcjonalności dla niezalogowanych użytkowników.
- System zachęca do rejestracji w celu uzyskania pełnej funkcjonalności.

ID: US-019
Tytuł: Ograniczenie dostępu do funkcji kolekcji
Opis: Jako administrator systemu chcę ograniczyć dostęp do funkcji kolekcji tylko dla zalogowanych użytkowników, aby zapewnić właściwą personalizację i zarządzanie danymi.
Kryteria akceptacji:

- Przyciski i linki do funkcji kolekcji są nieaktywne dla niezalogowanych użytkowników.
- Próba bezpośredniego dostępu do URL-i kolekcji przekierowuje na stronę logowania.
- System wyświetla informację o konieczności zalogowania się.

ID: US-020
Tytuł: Przycisk logowania w interfejsie
Opis: Jako użytkownik chcę mieć łatwy dostęp do funkcji logowania poprzez przycisk w prawym górnym rogu interfejsu, aby szybko zalogować się do systemu.
Kryteria akceptacji:

- Przycisk logowania jest widoczny w prawym górnym rogu na wszystkich stronach dla niezalogowanych użytkowników.
- Kliknięcie przycisku przekierowuje na stronę logowania.
- Przycisk jest odpowiednio oznaczony tekstem lub ikoną wskazującą na funkcję logowania.

ID: US-021
Tytuł: Wylogowanie z systemu
Opis: Jako zalogowany użytkownik chcę mieć możliwość wylogowania się z systemu za pomocą przycisku w prawym górnym rogu, aby zakończyć sesję w bezpieczny sposób.
Kryteria akceptacji:

- Przycisk wylogowania jest widoczny w prawym górnym rogu dla zalogowanych użytkowników.
- Kliknięcie przycisku kończy sesję użytkownika i przekierowuje na stronę główną.
- System wyświetla potwierdzenie pomyślnego wylogowania.

ID: US-022
Tytuł: Bezpieczne uwierzytelnianie bez zewnętrznych serwisów
Opis: Jako użytkownik chcę mieć pewność, że system wykorzystuje własne mechanizmy uwierzytelniania bez polegania na zewnętrznych serwisach, aby moje dane logowania były przechowywane tylko w jednym miejscu.
Kryteria akceptacji:

- System nie oferuje opcji logowania przez zewnętrzne serwisy (Google, GitHub, itp.).
- Dane uwierzytelniające są przechowywane w bezpieczny sposób w bazie danych systemu.
- Hasła są odpowiednio szyfrowane i nie są przechowywane w formie jawnej.

ID: US-023
Tytuł: Odzyskiwanie zapomnianego hasła
Opis: Jako użytkownik, który zapomniał hasła, chcę mieć możliwość jego zresetowania, aby odzyskać dostęp do swojego konta.
Kryteria akceptacji:

- Na stronie logowania znajduje się opcja "Zapomniałem hasła".
- System wysyła link do resetowania hasła na adres email użytkownika.
- Link umożliwia ustawienie nowego hasła i ma ograniczony czas ważności.

## 8. Metryki sukcesu

1. Efektywność generowania fiszek:
   - 75% wygenerowanych przez AI fiszek jest akceptowanych przez użytkownika.
   - Użytkownicy tworzą co najmniej 75% fiszek z wykorzystaniem AI (w stosunku do wszystkich nowo dodanych fiszek).
2. Zaangażowanie:
   - Monitorowanie liczby wygenerowanych fiszek i porównanie z liczbą zatwierdzonych do analizy jakości i użyteczności.
