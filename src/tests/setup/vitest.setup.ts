import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Importujemy mocki
import './mocks/supabase.mock';

// Ustawiamy zmienne środowiskowe dla testów
process.env.PUBLIC_SUPABASE_URL = 'https://example-supabase.co';
process.env.PUBLIC_SUPABASE_ANON_KEY = 'example-anon-key';

// Automatyczne czyszczenie po każdym teście
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Globalne mocki
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mockowanie fetch
global.fetch = vi.fn();

// Rozszerzenie oczekiwań dla lepszych asercji
expect.extend({
  toBeInTheDocument: (received) => {
    const pass = received !== null && received !== undefined;
    return {
      pass,
      message: () => pass
        ? `expected element not to be in the document`
        : `expected element to be in the document`,
    };
  },
}); 