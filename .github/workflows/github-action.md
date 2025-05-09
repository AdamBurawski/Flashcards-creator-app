# GitHub Actions dla Flashcards Creator App

Ten dokument zawiera najważniejsze informacje dotyczące konfiguracji GitHub Actions w projekcie Flashcards Creator App.

## Struktura CI/CD

W projekcie używamy dwóch głównych workflows:

1. **Pull Request Checks** (`pull-request.yml`) - uruchamiany przy każdym PR do gałęzi `master`
2. **Test, Build & Deploy na Netlify** (`master.yml`) - uruchamiany przy każdym push do gałęzi `master`

## Wymagane sekrety

W ustawieniach repozytorium GitHub należy zdefiniować następujące sekrety:

- `PUBLIC_SUPABASE_URL` - publiczny URL do bazy Supabase
- `PUBLIC_SUPABASE_KEY` - publiczny klucz do bazy Supabase
- `NETLIFY_AUTH_TOKEN` - token autoryzacyjny do Netlify
- `NETLIFY_SITE_ID` - ID projektu Netlify
- `OPENROUTER_API_KEY` - klucz API do OpenRouter.ai (używany do AI)

## Zmienne środowiskowe w Netlify

W Netlify należy skonfigurować następujące zmienne środowiskowe:

- `PUBLIC_SUPABASE_URL` - publiczny URL do bazy Supabase
- `PUBLIC_SUPABASE_KEY` - publiczny klucz do bazy Supabase
- `OPENROUTER_API_KEY` - klucz API do OpenRouter.ai

## Workflow Master (deploy)

Workflow `master.yml` składa się z dwóch głównych jobów:

1. **Test i Build** - sprawdza formatowanie, linty, testy jednostkowe oraz buduje aplikację
2. **Wdrożenie na Netlify** - wdraża zbudowaną aplikację na Netlify

Używamy akcji `nwtgck/actions-netlify@v3.0` do wdrożenia na Netlify.

## Best Practices

- Używamy zawsze `actions/checkout@v4` do pobierania kodu
- Używamy zawsze `actions/setup-node@v4` z cache npm dla szybszej instalacji
- Dla jobów korzystających ze zmiennych środowiskowych definiujemy je na poziomie joba
- Używamy tylko głównych wersji (v3, v4) dla zewnętrznych Actions, aby uniknąć niespodziewanych zmian
- Zapisujemy artefakty budowania z `retention-days: 7`
- Przekazujemy zmienne środowiskowe zarówno do procesu budowania jak i do wdrażania

## Rozwiązywanie problemów

Jeśli deployment nie powiedzie się, sprawdź:

1. Czy sekrety `NETLIFY_AUTH_TOKEN` i `NETLIFY_SITE_ID` są poprawnie skonfigurowane
2. Czy wszystkie wymagane zmienne środowiskowe są ustawione w GitHub Secrets
3. Czy wszystkie wymagane zmienne środowiskowe są ustawione w Netlify
4. Status budowania w GitHub Actions
5. Logi wdrożenia w Netlify

### Typowe błędy:

- `Command failed with exit code 1: npm run build` - najprawdopodobniej brakuje zmiennych środowiskowych
- Brak dostępu do Supabase - sprawdź klucze `PUBLIC_SUPABASE_URL` i `PUBLIC_SUPABASE_KEY`
- Problemy z Netlify - sprawdź `NETLIFY_AUTH_TOKEN` i `NETLIFY_SITE_ID`

## Aktualizacja workflow

Przy aktualizacji workflow zawsze sprawdź najnowsze wersje używanych akcji:

```bash
curl -s https://api.github.com/repos/<owner>/<repo>/releases/latest | grep '"tag_name":' | sed -E 's/.*"v([0-9]+).*/\1/'
```

Przykładowo, aby sprawdzić najnowszą wersję akcji Netlify:

```bash
curl -s https://api.github.com/repos/nwtgck/actions-netlify/releases/latest | grep '"tag_name":' | sed -E 's/.*"v([0-9]+).*/\1/'
```
