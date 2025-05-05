import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockSupabaseClient } from "../../tests/setup/mocks/supabase.mock";

// Musimy zdefiniować mocki PRZED importem testowanych modułów
// Używamy BYPASS_DATABASE=true aby ignorować operacje na bazie danych
vi.stubEnv('BYPASS_DATABASE', 'true');

vi.mock("../../db/supabase.client", () => ({
  supabase: mockSupabaseClient,
  DEFAULT_USER_ID: "test-user-id",
}));

// Mockujemy AIService tak, aby zachowywał się zgodnie z oczekiwaniami w testach
vi.mock("../ai.service", () => ({
  AIService: vi.fn(),
  AIServiceError: class AIServiceError extends Error {
    code: string;
    constructor(message: string, code: string = "AI_SERVICE_ERROR") {
      super(message);
      this.name = "AIServiceError";
      this.code = code;
    }
  },
}));

// Mockujemy funkcję mockAiGeneration
vi.mock("../generation.service", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    mockAiGeneration: vi.fn().mockImplementation(() => mockProposals),
  };
});

// Teraz importujemy testowane moduły
import { generateFlashcards } from "../generation.service";
import { AIService, AIServiceError } from "../ai.service";

// Przygotowujemy globalne mocki
const mockProposals = [
  {
    front: "Test question",
    back: "Test answer",
    source: "ai-full",
  },
];

describe("Generations Service", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();
    vi.stubEnv('BYPASS_DATABASE', 'true');

    // Przygotowujemy mocki z domyślnymi implementacjami
    const mockGenerateFlashcards = vi.fn().mockResolvedValue(mockProposals);
    const mockGetModel = vi.fn().mockReturnValue("gpt-4");

    // Mockujemy implementację AIService
    vi.mocked(AIService).mockImplementation(() => ({
      generateFlashcards: mockGenerateFlashcards,
      getModel: mockGetModel,
    }));
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("should generate flashcards successfully", async () => {
    // Define test input
    const sourceText = "A".repeat(1000); // Valid source text
    
    // Upewniamy się, że BYPASS_DATABASE jest ustawione na true
    vi.stubEnv('BYPASS_DATABASE', 'true');
    vi.stubEnv('OPENROUTER_API_KEY', undefined);

    // Ustawiamy stały ID dla testu
    vi.spyOn(Math, 'random').mockReturnValue(0.123);

    // Call the function
    const result = await generateFlashcards(sourceText);

    // Sprawdzamy czy rezultat ma odpowiedni format
    expect(result).toHaveProperty('generationId', 123);
    expect(result).toHaveProperty('proposals');
    expect(Array.isArray(result.proposals)).toBe(true);
  });

  it("should handle AI service errors", async () => {
    // 1. Najpierw resetujemy poprzedni mock
    vi.mocked(AIService).mockReset();
    
    // 2. Ustawiamy wartość OPENROUTER_API_KEY aby użyć AI zamiast mockowania
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    
    // 3. Tworzymy mock AIService, który rzuca błąd
    vi.mocked(AIService).mockImplementation(() => ({
      generateFlashcards: vi.fn().mockRejectedValue(
        new AIServiceError("AI service failed", "TEST_ERROR")
      ),
      getModel: vi.fn().mockReturnValue("gpt-4"),
    }));
    
    // 4. Ustawiamy stały ID dla testu
    vi.spyOn(Math, 'random').mockReturnValue(0.123);

    // 5. Wyłączamy BYPASS_DATABASE aby sprawdzić obsługę błędów
    vi.stubEnv('BYPASS_DATABASE', 'false');
    
    // 6. Mockujemy metodę from().insert().select().single() Supabase
    mockSupabaseClient.from.mockImplementation(() => {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 123 },
              error: null,
            }),
          }),
        }),
      };
    });

    // 7. Call the function - powinna użyć danych mockowych po błędzie AI
    const result = await generateFlashcards("A".repeat(1000));

    // 8. Verify the result - powinniśmy dostać mockowe dane po obsłudze błędu
    expect(result.generationId).toBe(123);
    expect(result.proposals).toHaveLength(5); // mockAiGeneration tworzy 5 fiszek
    expect(result.proposals[0].front).toContain("Question 1 about");
  });

  it("should handle database errors", async () => {
    // Ustawienie BYPASS_DATABASE na false
    vi.stubEnv('BYPASS_DATABASE', 'false');

    // Mockujemy supabase aby symulować błąd bazy danych
    mockSupabaseClient.from.mockImplementation(() => {
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            }),
          }),
        }),
      };
    });
    
    // Ustawiamy stały ID dla mockowej odpowiedzi
    vi.spyOn(Math, 'random').mockReturnValue(0.123);

    // Define test input
    const sourceText = "A".repeat(1000); // Valid source text

    // Call the function - powinna obsłużyć błąd i zwrócić mockowe dane
    const result = await generateFlashcards(sourceText);

    // Verify result - w przypadku błędu bazy generuje randomowy ID i zwraca mockowe dane
    expect(result.generationId).toBe(123);
    expect(result.proposals).toBeDefined();
  });
});

// Test suite for API endpoint
describe("Generations API Endpoint", () => {
  it("should handle valid requests", async () => {
    // Placeholder for API endpoint test
  });

  it("should reject requests with invalid source_text length", async () => {
    // Placeholder for validation test
  });
});
