import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockSupabaseClient } from "../../tests/setup/mocks/supabase.mock";

// Musimy zdefiniować mocki PRZED importem testowanych modułów
vi.mock("../../db/supabase.client", () => ({
  supabase: mockSupabaseClient,
  DEFAULT_USER_ID: "test-user-id",
}));

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

// Teraz możemy importować testowane moduły
import { generateFlashcards } from "../generation.service";
import { AIService, AIServiceError } from "../ai.service";

describe("Generations Service", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Mock implementation of AIService
    vi.mocked(AIService).mockImplementation(() => ({
      generateFlashcards: vi.fn().mockResolvedValue([
        {
          front: "Test question",
          back: "Test answer",
          source: "ai-full",
        },
      ]),
      getModel: vi.fn().mockReturnValue("gpt-4"),
    }));

    // Konfiguracja mocka Supabase dla każdego testu
    mockSupabaseClient.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 123 }],
          error: null,
        }),
      }),
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should generate flashcards successfully", async () => {
    // Define test input
    const sourceText = "A".repeat(1000); // Valid source text

    // Call the function
    const result = await generateFlashcards(sourceText);

    // Verify the result
    expect(result).toEqual({
      generationId: 123,
      proposals: [
        {
          front: "Test question",
          back: "Test answer",
          source: "ai-full",
        },
      ],
    });
  });

  it("should handle AI service errors", async () => {
    // Override the mock to simulate an error
    vi.mocked(AIService).mockImplementation(() => ({
      generateFlashcards: vi.fn().mockRejectedValue(new AIServiceError("AI service failed", "TEST_ERROR")),
      getModel: vi.fn().mockReturnValue("gpt-4"),
    }));

    // Define test input
    const sourceText = "A".repeat(1000); // Valid source text

    // Check that the function throws an error
    await expect(generateFlashcards(sourceText)).rejects.toThrow("AI service error");
  });

  it("should handle database errors", async () => {
    // Override the mock to simulate a database error
    mockSupabaseClient.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      }),
    });

    // Define test input
    const sourceText = "A".repeat(1000); // Valid source text

    // Check that the function throws an error
    await expect(generateFlashcards(sourceText)).rejects.toThrow("Failed to save generation metadata");
  });
});

// Test suite for API endpoint
describe("Generations API Endpoint", () => {
  it("should handle valid requests", async () => {
    // This would be a complete E2E test with a mocked or test database
    // For now, we're just providing the structure
    // Mock implementation details will depend on the testing framework and approach used
    // Example using node-fetch or similar:
    /*
    const response = await fetch('/api/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source_text: 'A'.repeat(1000)
      })
    });
    
    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data).toHaveProperty('generation_id');
    expect(data).toHaveProperty('flashcards_proposals');
    expect(data).toHaveProperty('generated_count');
    */
  });

  it("should reject requests with invalid source_text length", async () => {
    // Example of validation test
    /*
    const response = await fetch('/api/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source_text: 'Too short'
      })
    });
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
    */
  });
});
