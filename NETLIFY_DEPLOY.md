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
   - **WAŻNE**: To jest kluczowy krok! Dodaj następujące zmienne środowiskowe:
     - `PUBLIC_SUPABASE_URL` - URL twojej instancji Supabase
     - `PUBLIC_SUPABASE_KEY` - Klucz publiczny Supabase (anon key)
     - `SUPABASE_URL` - URL twojej instancji Supabase (taki sam jak powyżej)
     - `SUPABASE_KEY` - Klucz publiczny Supabase (taki sam jak powyżej)
   - Upewnij się, że wszystkie zmienne są poprawnie zapisane (bez błędów typograficznych)
   - Po dodaniu zmiennych, kliknij "Trigger deploy" > "Clear cache and deploy site"

4. **Funkcje Netlify**:

   - Aplikacja używa standardowych funkcji Netlify (nie Edge Functions)
   - Adapter Astro dla Netlify automatycznie generuje potrzebne pliki funkcji
   - Funkcje są przechowywane w katalogu `netlify/functions`

5. **Rozwiązywanie problemów**:
   - W przypadku błędu "supabaseUrl is required":
     - Sprawdź, czy zmienne środowiskowe są poprawnie skonfigurowane w panelu Netlify
     - Upewnij się, że nazwy zmiennych są dokładnie takie, jak wymagane (PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY, SUPABASE_URL, SUPABASE_KEY)
     - Po dodaniu zmiennych, zainicjuj ponowne wdrożenie z wyczyszczeniem cache
   - Sprawdź logi wdrażania i funkcji w panelu Netlify (Functions > nazwa_funkcji > Logs)
   - Jeśli widzisz błędy CORS, upewnij się, że domena Netlify jest dodana do listy dozwolonych domen w konfiguracji Supabase

## Ważne uwagi

- Funkcje Netlify mają limit wykonania 10 sekund, upewnij się że Twoje zapytania do Supabase są zoptymalizowane
- Netlify Functions używają AWS Lambda, co może wprowadzać pewne ograniczenia dla operacji Node.js
- W przypadku problemów z pakietami, sprawdź plik `.npmrc`, który zawiera niezbędne flagi dla instalacji zależności
- Aplikacja została zaktualizowana, aby była bardziej odporna na brak zmiennych środowiskowych

## Testy lokalne przed wdrożeniem

Możesz przetestować budowanie dla Netlify lokalnie używając komendy:

```bash
# Ustaw zmienne środowiskowe lokalnie
export PUBLIC_SUPABASE_URL="twój_url_supabase"
export PUBLIC_SUPABASE_KEY="twój_klucz_supabase"
export SUPABASE_URL="twój_url_supabase"
export SUPABASE_KEY="twój_klucz_supabase"

# Uruchom budowanie
npm run netlify:build
```

Następnie możesz użyć Netlify CLI do lokalnego podglądu:

```bash
# Zainstaluj Netlify CLI, jeśli nie jest zainstalowane
npm install -g netlify-cli

# Uruchom lokalny serwer z tymi samymi zmiennymi środowiskowymi
netlify dev
```

## Bezpieczeństwo

- NIGDY nie dodawaj wrażliwych kluczy bezpośrednio do pliku `netlify.toml`
- Zawsze korzystaj z panelu zmiennych środowiskowych w Netlify
- Klucze API dodane do panelu Netlify są bezpiecznie szyfrowane i nie są widoczne po zapisaniu
