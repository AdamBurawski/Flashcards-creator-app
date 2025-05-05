import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGenerateFlashcards } from '../../hooks/useGenerateFlashcards';
import type { GenerationCreateResponseDto } from '../../types';

// Mock dla globalnego fetch
global.fetch = vi.fn();

describe('useGenerateFlashcards', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('powinien zainicjalizować się z domyślnymi wartościami', () => {
    const { result } = renderHook(() => useGenerateFlashcards());

    expect(result.current.flashcardProposals).toEqual([]);
    expect(result.current.generationId).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.successMessage).toBeNull();
  });

  it('powinien zwrócić błąd, gdy tekst źródłowy jest za krótki', async () => {
    const { result } = renderHook(() => useGenerateFlashcards());

    let success;
    await act(async () => {
      success = await result.current.generateFlashcards('Krótki tekst');
    });

    expect(success).toBe(false);
    expect(result.current.error).toContain('Tekst musi mieć długość');
  });

  it('powinien generować fiszki dla poprawnego tekstu', async () => {
    // Mockowanie odpowiedzi API
    const mockResponse: GenerationCreateResponseDto = {
      generation_id: 123,
      flashcards_proposals: [
        { front: 'Pytanie 1', back: 'Odpowiedź 1', source: 'ai' },
        { front: 'Pytanie 2', back: 'Odpowiedź 2', source: 'ai' }
      ]
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const { result } = renderHook(() => useGenerateFlashcards());

    // Użycie długiego tekstu, który przejdzie walidację
    const longText = 'a'.repeat(1000);
    
    let success;
    await act(async () => {
      success = await result.current.generateFlashcards(longText);
    });

    expect(success).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.generationId).toBe(123);
    expect(result.current.flashcardProposals).toHaveLength(2);
    expect(result.current.flashcardProposals[0].front).toBe('Pytanie 1');
    expect(result.current.flashcardProposals[0].accepted).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('powinien obsłużyć błąd przy nieudanym wywołaniu API', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: 'Błąd serwera' })
    });

    const { result } = renderHook(() => useGenerateFlashcards());

    let success;
    await act(async () => {
      success = await result.current.generateFlashcards('a'.repeat(1000));
    });

    expect(success).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Błąd serwera');
  });

  it('powinien akceptować fiszkę', async () => {
    // Najpierw musimy wygenerować fiszki, aby mieć co akceptować
    const mockResponse: GenerationCreateResponseDto = {
      generation_id: 123,
      flashcards_proposals: [
        { front: 'P1', back: 'O1', source: 'ai' },
        { front: 'P2', back: 'O2', source: 'ai' }
      ]
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const { result } = renderHook(() => useGenerateFlashcards());
    
    // Generujemy fiszki
    await act(async () => {
      await result.current.generateFlashcards('a'.repeat(1000));
    });
    
    // Sprawdzamy początkowy stan
    expect(result.current.flashcardProposals[0].accepted).toBe(false);
    
    // Akceptacja pierwszej fiszki
    act(() => {
      result.current.acceptFlashcard(0);
    });

    // Sprawdzamy, czy stan się zmienił
    expect(result.current.flashcardProposals[0].accepted).toBe(true);
    expect(result.current.flashcardProposals[1].accepted).toBe(false);
  });
}); 