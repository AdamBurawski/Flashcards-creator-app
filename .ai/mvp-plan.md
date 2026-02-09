# MVP – opis aplikacji

Aplikacja w fazie MVP to **SPA**, która:

- Generuje dokumenty z podręcznikami (zwane dalej **e-podręcznikami**) z dostarczonych skanów lub plików.
- Umożliwia mamie wybór, z których e-podręczników chce korzystać.
- Umożliwia wybór kilku gotowych e-podręczników (od nas).
- Przyjmuje od mamy instrukcję dotyczącą dni i godzin, jakie poświęca z dzieckiem na naukę.
- Na podstawie tego wyboru oraz instrukcji generuje **roczny plan nauki** dla dziecka. Plan uwzględnia:
  - wiedzę do opanowania,
  - ćwiczenia,
  - testy,
  - powtarzanie wiedzy oraz testów.
- Umożliwia wydruk materiału przeznaczonego na dany dzień.
- Przyjmuje skan z wykonanymi ćwiczeniami lub testem i sprawdza je.
- Na podstawie dostarczonych wykonanych ćwiczeń lub testów monitoruje postępy w nauce:
  - „odznacza” punkty planu nauki,
  - generuje statystyki,
  - podsumowania itd.

---

# Plan pracy nad MVP

1. „Stworzyć fiszki w oparciu o zaszytą wiedzę z podręcznika, a nie dodanie tekstu w oknie”.
2. Stworzenie fiszek w oparciu o skan dowolnego podręcznika.
3. Wygenerowanie testów sprawdzających wiedzę wraz z odpowiedziami w oparciu o skan dowolnego podręcznika.
4. Wygenerowanie ćwiczeń wraz z odpowiedziami w oparciu o skan dowolnego podręcznika.
5. Wygenerowanie wiedzy do opanowania podzielonej na dowolne części w oparciu o skan dowolnego podręcznika.
6. Wygenerowanie rocznego planu nauki w oparciu o instrukcję, w jakich dniach i godzinach dziecko się uczy oraz… skan dowolnego podręcznika :-)
7. Plan nauki uwzględnia:
   - wiedzę do opanowania,
   - ćwiczenia,
   - testy sprawdzające wiedzę,
   - powtarzanie wiedzy oraz testów w pewnych interwałach (dla upewnienia się, czy powtarzanie jest skuteczne).
8. Wygenerowanie planu jw., ale z uwzględnieniem kilku podręczników do różnych przedmiotów (np. polski, matematyka, angielski).

---

# Widoki (UI)

8\*. Stworzenie widoków:

- harmonogramu (z zaznaczaniem przerobionego materiału),
- dokumentu z wiedzą,
- ćwiczeń (i odpowiedzi),
- testów (i odpowiedzi),
- statystyk,
- dashboardu?

---

# Integracje i operacje

- Wlanie danych generowanych przez aplikację do widoków.
- Zapewnienie możliwości wydruku materiałów.
- Zapewnienie możliwości zeskanowania i sprawdzenia wykonanych ćwiczeń i testów + na podstawie tych skanów model sam zaznacza w planie, co zostało przerobione i w jakim stopniu.
- Wygenerowanie w naszym własnym narzędziu kilku takich e-podręczników na podstawie źródeł w wolnym dostępie, możliwych do wykorzystania przez rodziców — zanim cokolwiek swoje zeskanują, już mogą z czegoś skorzystać i sprawdzić jak to działa.

---

# Kolejne ficzery (więcej niż MVP)

- **Interaktywność** — dziecko podczas nauki może rozmawiać z botem, który je koryguje, daje feedback na bieżąco itd.
- Zapewnienie możliwości „odklikania” elementów planu na podstawie notatki głosowej: mama mówi, co przerobiła, a model sam to zaznacza w planie.
- Instrukcja od mamy dotyczy także możliwości prowadzenia zajęć w terenie. Na jej podstawie harmonogram uwzględnia propozycje zajęć:
  - w lokalnym środowisku (las, łąka, park, plac zabaw),
  - w miejscowości dziecka (lokalne muzeum, biblioteka, pomnik, znane miejsce),
  - w innej miejscowości w Polsce,
  - w innej miejscowości za granicą.
- **Mom agile** — mama w ciągu roku weryfikuje, czy na pewno udaje się pracować wg założonego planu (albo aplikacja sama jej sugeruje, że coś idzie nie tak), a plan dostosowuje się do zaktualizowanej instrukcji (np. „no nie, tak naprawdę jesteśmy w stanie uczyć się tylko 4 godziny dziennie, i bez poniedziałków”).
