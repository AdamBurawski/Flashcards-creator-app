# Test info

- Name: Tworzenie nowej kolekcji >> powinno wyświetlić błąd przy próbie utworzenia kolekcji bez nazwy
- Location: /Volumes/Develop/Kursy/Kurs 10xDevs/Flashcards-Creator-App/Flashcards-creator-app/tests/e2e/create-collection.spec.ts:69:3

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toBeVisible()

Locator: locator('[data-test-id="error-message"], .alert-danger, .error, div:has-text("błąd"), div:has-text("wymagana"), div.error').first()
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 5000ms
  - waiting for locator('[data-test-id="error-message"], .alert-danger, .error, div:has-text("błąd"), div:has-text("wymagana"), div.error').first()

    at NewCollectionModal.verifyError (/Volumes/Develop/Kursy/Kurs 10xDevs/Flashcards-Creator-App/Flashcards-creator-app/tests/e2e/pages/new-collection-modal.ts:238:44)
    at /Volumes/Develop/Kursy/Kurs 10xDevs/Flashcards-Creator-App/Flashcards-creator-app/tests/e2e/create-collection.spec.ts:86:5
```

# Page snapshot

```yaml
- banner:
  - link "Flashcards Creator":
    - /url: /
  - navigation:
    - link "Strona główna":
      - /url: /
    - link "Generowanie":
      - /url: /generate
    - link "Kolekcje":
      - /url: /collections
    - button "Wyloguj"
- main:
  - heading "Moje kolekcje fiszek" [level=1]
  - heading "Status autentykacji" [level=2]
  - paragraph: Zalogowany
  - button "Pokaż szczegóły"
  - heading "Witaj, a.burawski@wp.pl!" [level=2]
  - paragraph: Twoje kolekcje fiszek są wyświetlane poniżej.
  - heading "Import 1746640378961-8919" [level=3]
  - text: 0 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 20:02"
  - link "Przeglądaj":
    - /url: /collections/39
  - link "Ucz się":
    - /url: /flashcards/learn/39
  - heading "Import 1746640957661-2749" [level=3]
  - text: 5 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 20:02"
  - link "Przeglądaj":
    - /url: /collections/41
  - link "Ucz się":
    - /url: /flashcards/learn/41
  - heading "Kolekcja 1746640957738-1127" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 20:02"
  - link "Przeglądaj":
    - /url: /collections/42
  - link "Ucz się":
    - /url: /flashcards/learn/42
  - heading "Import 1746640302151-2820" [level=3]
  - text: 0 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 19:53"
  - link "Przeglądaj":
    - /url: /collections/37
  - link "Ucz się":
    - /url: /flashcards/learn/37
  - heading "Kolekcja 1746640379273-4625" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 19:52"
  - link "Przeglądaj":
    - /url: /collections/40
  - link "Ucz się":
    - /url: /flashcards/learn/40
  - heading "Import 1746640248500-5542" [level=3]
  - text: 0 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 19:51"
  - link "Przeglądaj":
    - /url: /collections/36
  - link "Ucz się":
    - /url: /flashcards/learn/36
  - heading "Kolekcja 1746640302176-2986" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 19:51"
  - link "Przeglądaj":
    - /url: /collections/38
  - link "Ucz się":
    - /url: /flashcards/learn/38
  - heading "Import 1746639847707-2545" [level=3]
  - text: 0 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 19:50"
  - link "Przeglądaj":
    - /url: /collections/34
  - link "Ucz się":
    - /url: /flashcards/learn/34
  - heading "Kolekcja 1746640248433-3752" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 19:50"
  - link "Przeglądaj":
    - /url: /collections/35
  - link "Ucz się":
    - /url: /flashcards/learn/35
  - heading "Import 1746639820089-4196" [level=3]
  - text: 0 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 19:44"
  - link "Przeglądaj":
    - /url: /collections/33
  - link "Ucz się":
    - /url: /flashcards/learn/33
  - heading "Import 1746637294647-3844" [level=3]
  - text: 0 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 19:43"
  - link "Przeglądaj":
    - /url: /collections/24
  - link "Ucz się":
    - /url: /flashcards/learn/24
  - heading "Kolekcja 1746639817878-1714" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 19:43"
  - link "Przeglądaj":
    - /url: /collections/32
  - link "Ucz się":
    - /url: /flashcards/learn/32
  - heading "Kolekcja 1746639399942-7459" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 19:36"
  - link "Przeglądaj":
    - /url: /collections/31
  - link "Ucz się":
    - /url: /flashcards/learn/31
  - heading "Import 1746639133479-2755" [level=3]
  - text: 0 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 19:32"
  - link "Przeglądaj":
    - /url: /collections/30
  - link "Ucz się":
    - /url: /flashcards/learn/30
  - heading "Import 1746638905003-1064" [level=3]
  - text: 0 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 19:28"
  - link "Przeglądaj":
    - /url: /collections/29
  - link "Ucz się":
    - /url: /flashcards/learn/29
  - heading "Kolekcja 1746638789120-6550" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 19:26"
  - link "Przeglądaj":
    - /url: /collections/27
  - link "Ucz się":
    - /url: /flashcards/learn/27
  - heading "Import 1746638789100-7329" [level=3]
  - text: 0 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 19:26"
  - link "Przeglądaj":
    - /url: /collections/28
  - link "Ucz się":
    - /url: /flashcards/learn/28
  - heading "Kolekcja 1746638345643-1426" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 19:19"
  - link "Przeglądaj":
    - /url: /collections/26
  - link "Ucz się":
    - /url: /flashcards/learn/26
  - heading "Import 1746638345447-2696" [level=3]
  - text: 0 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 19:19"
  - link "Przeglądaj":
    - /url: /collections/25
  - link "Ucz się":
    - /url: /flashcards/learn/25
  - heading "Import 1746636726015-3493" [level=3]
  - text: 0 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 19:01"
  - link "Przeglądaj":
    - /url: /collections/22
  - link "Ucz się":
    - /url: /flashcards/learn/22
  - heading "Kolekcja 1746637294544-4114" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 19:01"
  - link "Przeglądaj":
    - /url: /collections/23
  - link "Ucz się":
    - /url: /flashcards/learn/23
  - heading "Import 1746636528914-3182" [level=3]
  - text: 0 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:52"
  - link "Przeglądaj":
    - /url: /collections/20
  - link "Ucz się":
    - /url: /flashcards/learn/20
  - heading "Kolekcja 1746636725943-4353" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:52"
  - link "Przeglądaj":
    - /url: /collections/21
  - link "Ucz się":
    - /url: /flashcards/learn/21
  - heading "Import 1746636328589-3732" [level=3]
  - text: 0 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:48"
  - link "Przeglądaj":
    - /url: /collections/17
  - link "Ucz się":
    - /url: /flashcards/learn/17
  - heading "Kolekcja 1746636528344-3853" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:48"
  - link "Przeglądaj":
    - /url: /collections/19
  - link "Ucz się":
    - /url: /flashcards/learn/19
  - heading "Import 1746636188442-342" [level=3]
  - text: 0 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:45"
  - link "Przeglądaj":
    - /url: /collections/15
  - link "Ucz się":
    - /url: /flashcards/learn/15
  - heading "Kolekcja 1746636328765-7271" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:45"
  - link "Przeglądaj":
    - /url: /collections/18
  - link "Ucz się":
    - /url: /flashcards/learn/18
  - heading "Import 1746635959930-6418" [level=3]
  - text: 0 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:43"
  - link "Przeglądaj":
    - /url: /collections/14
  - link "Ucz się":
    - /url: /flashcards/learn/14
  - heading "Kolekcja 1746636188648-7330" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:43"
  - link "Przeglądaj":
    - /url: /collections/16
  - link "Ucz się":
    - /url: /flashcards/learn/16
  - heading "Import 1746635622643-1025" [level=3]
  - text: 0 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:39"
  - link "Przeglądaj":
    - /url: /collections/11
  - link "Ucz się":
    - /url: /flashcards/learn/11
  - heading "Kolekcja 1746635959918-8701" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:39"
  - link "Przeglądaj":
    - /url: /collections/13
  - link "Ucz się":
    - /url: /flashcards/learn/13
  - heading "Import 1746635130573-3143" [level=3]
  - text: 0 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:33"
  - link "Przeglądaj":
    - /url: /collections/9
  - link "Ucz się":
    - /url: /flashcards/learn/9
  - heading "Kolekcja 1746635622823-9400" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:33"
  - link "Przeglądaj":
    - /url: /collections/12
  - link "Ucz się":
    - /url: /flashcards/learn/12
  - heading "Kolekcja 1746635364630-8659" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:29"
  - link "Przeglądaj":
    - /url: /collections/10
  - link "Ucz się":
    - /url: /flashcards/learn/10
  - heading "Import 1746633972627-1381" [level=3]
  - text: 0 fiszek
  - paragraph: Kolekcja do testowania importu fiszek
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:25"
  - link "Przeglądaj":
    - /url: /collections/5
  - link "Ucz się":
    - /url: /flashcards/learn/5
  - heading "Kolekcja 1746635130628-6008" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:25"
  - link "Przeglądaj":
    - /url: /collections/8
  - link "Ucz się":
    - /url: /flashcards/learn/8
  - heading "Kolekcja 1746634785700-6463" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:19"
  - link "Przeglądaj":
    - /url: /collections/7
  - link "Ucz się":
    - /url: /flashcards/learn/7
  - heading "Kolekcja 1746634288526-4531" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:11"
  - link "Przeglądaj":
    - /url: /collections/6
  - link "Ucz się":
    - /url: /flashcards/learn/6
  - heading "II Wojna Światowa" [level=3]
  - text: "0 fiszek Ostatnia aktualizacja: 7 maj 2025, 18:06"
  - link "Przeglądaj":
    - /url: /collections/3
  - link "Ucz się":
    - /url: /flashcards/learn/3
  - heading "Kolekcja 1746633972683-9426" [level=3]
  - text: 0 fiszek
  - paragraph: Opis testowej kolekcji utworzonej przez test e2e
  - text: "Ostatnia aktualizacja: 7 maj 2025, 18:06"
  - link "Przeglądaj":
    - /url: /collections/4
  - link "Ucz się":
    - /url: /flashcards/learn/4
  - heading "Dinozaury" [level=3]
  - text: "4 fiszek Ostatnia aktualizacja: 6 maj 2025, 22:46"
  - link "Przeglądaj":
    - /url: /collections/2
  - link "Ucz się":
    - /url: /flashcards/learn/2
  - heading "Kościół Katolicki" [level=3]
  - text: "5 fiszek Ostatnia aktualizacja: 6 maj 2025, 22:40"
  - link "Przeglądaj":
    - /url: /collections/1
  - link "Ucz się":
    - /url: /flashcards/learn/1
  - heading "Utwórz nową kolekcję" [level=3]
  - button "+ Nowa kolekcja"
  - heading "Utwórz nową kolekcję" [level=3]
  - text: Nazwa kolekcji
  - textbox "Nazwa kolekcji"
  - text: Opis (opcjonalny)
  - textbox "Opis (opcjonalny)"
  - button "Anuluj"
  - button "Utwórz kolekcję"
```

# Test source

```ts
  138 |
  139 |   /**
  140 |    * Klika przycisk anulowania
  141 |    */
  142 |   async cancel() {
  143 |     // Sprawdź, czy standardowy przycisk jest widoczny
  144 |     const cancelButtonVisible = await this.cancelButton.isVisible().catch(() => false);
  145 |     
  146 |     if (cancelButtonVisible) {
  147 |       await this.cancelButton.click();
  148 |     } else {
  149 |       // Szukaj przycisku anulowania po tekście
  150 |       const cancelButtons = [
  151 |         this.page.getByText('Anuluj', { exact: false }),
  152 |         this.page.getByText('Zamknij', { exact: false }),
  153 |         this.page.getByText('Cancel', { exact: false }),
  154 |         this.page.locator('button[type="button"]:not([type="submit"])').first()
  155 |       ];
  156 |       
  157 |       for (const btn of cancelButtons) {
  158 |         if (await btn.isVisible().catch(() => false)) {
  159 |           await btn.click();
  160 |           break;
  161 |         }
  162 |       }
  163 |     }
  164 |   }
  165 |
  166 |   /**
  167 |    * Tworzy nową kolekcję
  168 |    * @param name Nazwa kolekcji
  169 |    * @param description Opis kolekcji
  170 |    */
  171 |   async createCollection(name: string, description: string = '') {
  172 |     await this.fillForm(name, description);
  173 |     await this.create();
  174 |   }
  175 |
  176 |   /**
  177 |    * Sprawdza czy komunikat o sukcesie jest widoczny
  178 |    * @param name Opcjonalna nazwa kolekcji do sprawdzenia jej obecności na liście
  179 |    */
  180 |   async verifySuccess(name?: string) {
  181 |     // Komunikat sukcesu może być reprezentowany na różne sposoby
  182 |     const possibleSuccessMessages = [
  183 |       this.successMessage,
  184 |       this.page.locator('.alert-success, .success'),
  185 |       this.page.locator('div:has-text("utworzono"), div:has-text("utworzona"), div:has-text("zapisano")').first(),
  186 |     ];
  187 |     
  188 |     // Sprawdź czy którykolwiek komunikat jest widoczny
  189 |     for (const message of possibleSuccessMessages) {
  190 |       if (await message.isVisible().catch(() => false)) {
  191 |         return;
  192 |       }
  193 |     }
  194 |     
  195 |     // Jeśli żaden komunikat nie jest widoczny, ale zniknął modal, uznajemy to za sukces
  196 |     const modalVisible = await this.modal.isVisible().catch(() => false);
  197 |     if (!modalVisible) {
  198 |       return;
  199 |     }
  200 |     
  201 |     // Jeśli wszystkie powyższe zawiodły, sprawdź czy właśnie utworzona kolekcja jest widoczna na stronie
  202 |     if (name) {
  203 |       const newCollectionVisible = await this.page.getByText(name, { exact: false }).isVisible().catch(() => false);
  204 |       if (newCollectionVisible) {
  205 |         return;
  206 |       }
  207 |     }
  208 |     
  209 |     // Jeśli wszystko inne zawiodło, zgłoś błąd
  210 |     await expect(possibleSuccessMessages[0]).toBeVisible({ timeout: 10000 });
  211 |   }
  212 |
  213 |   /**
  214 |    * Sprawdza czy komunikat o błędzie jest widoczny
  215 |    */
  216 |   async verifyError() {
  217 |     // Komunikat błędu może być reprezentowany na różne sposoby
  218 |     const possibleErrorMessages = [
  219 |       this.errorMessage,
  220 |       this.page.locator('.alert-danger, .error'),
  221 |       this.page.locator('div:has-text("błąd"), div:has-text("wymagana"), div:has-text("niepoprawna")').first(),
  222 |     ];
  223 |     
  224 |     // Sprawdź czy którykolwiek komunikat jest widoczny
  225 |     for (const message of possibleErrorMessages) {
  226 |       if (await message.isVisible().catch(() => false)) {
  227 |         return;
  228 |       }
  229 |     }
  230 |     
  231 |     // Sprawdź, czy pole z błędem jest podświetlone (np. czerwona obramówka)
  232 |     const errorField = this.page.locator('input.error, input.invalid, input[aria-invalid="true"]');
  233 |     if (await errorField.isVisible().catch(() => false)) {
  234 |       return;
  235 |     }
  236 |     
  237 |     // Jeśli wszystko inne zawiodło, zgłoś błąd
> 238 |     await expect(possibleErrorMessages[0]).toBeVisible();
      |                                            ^ Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
  239 |   }
  240 | } 
```