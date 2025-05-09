# Instrukcja wdrażania aplikacji na Netlify

## Kroki wdrożenia

1. **Połącz repozytorium z Netlify**:

   - Zaloguj się do Netlify
   - Wybierz "New site from Git"
   - Wybierz swoje repozytorium z GitHuba

2. **Konfiguracja ustawień budowania**:

   - Build command: `npm run netlify:build`
   - Publish directory: `dist`

3. **Konfiguracja zmiennych środowiskowych**:

   - W panelu Netlify przejdź do: Site settings > Build & deploy > Environment
   - Dodaj następujące zmienne środowiskowe:
     - `PUBLIC_SUPABASE_URL` - URL twojej instancji Supabase
     - `PUBLIC_SUPABASE_KEY` - Klucz publiczny Supabase
     - `SUPABASE_URL` - URL twojej instancji Supabase (taki sam jak powyżej)
     - `SUPABASE_KEY` - Klucz publiczny Supabase (taki sam jak powyżej)

4. **Funkcje Netlify**:

   - Aplikacja używa standardowych funkcji Netlify (nie Edge Functions)
   - Adapter Astro dla Netlify automatycznie generuje potrzebne pliki funkcji

5. **Rozwiązywanie problemów**:
   - Jeśli pojawią się problemy z autoryzacją, upewnij się że zmienne środowiskowe są poprawnie ustawione
   - Sprawdź logi budowania i wdrażania w panelu Netlify
   - Możesz przetestować zmienne środowiskowe lokalnie, tworząc plik `.env` z tymi samymi zmiennymi

## Ważne uwagi

- Funkcje Netlify mają limit wykonania 10 sekund, upewnij się że Twoje zapytania do Supabase są zoptymalizowane
- Netlify Functions używają AWS Lambda, co może wprowadzać pewne ograniczenia dla operacji Node.js
- W przypadku problemów z pakietami, sprawdź plik `.npmrc`, który zawiera niezbędne flagi dla instalacji zależności

## Testy lokalne przed wdrożeniem

Możesz przetestować budowanie dla Netlify lokalnie używając komendy:

```bash
npm run netlify:build
```

Następnie możesz użyć Netlify CLI do lokalnego podglądu:

```bash
npx netlify-cli dev
```
