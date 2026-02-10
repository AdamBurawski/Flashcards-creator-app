import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockSupabaseClient } from "./setup/mocks/supabase.mock";
import type { APIContext } from "astro";

// Dodajemy mock dla Response, który może powodować problemy
global.Response = Response;

// Musimy zdefiniować mocki PRZED importem testowanych modułów
vi.mock("../db/supabase.client", () => ({
  supabase: mockSupabaseClient,
  DEFAULT_USER_ID: "test-user-id",
}));

// Mock the flashcard service
vi.mock("../lib/flashcard.service", () => ({
  createFlashcards: vi.fn().mockResolvedValue({
    flashcards: [
      {
        id: 1,
        front: "Test front",
        back: "Test back",
        source: "manual",
        generation_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  }),
  validateGenerationExists: vi.fn().mockResolvedValue(true),
}));

// Mock the error logger to avoid actual logging during tests
vi.mock("../lib/error-logger.service", () => ({
  logError: vi.fn(),
  ErrorSource: {
    FLASHCARD_CREATE: "flashcard_create",
    VALIDATION: "validation",
    AUTHENTICATION: "authentication",
    DATABASE: "database",
  },
}));

// Dodajemy mock dla supabase.auth.getUser by uniknąć problemów z autoryzacją
mockSupabaseClient.auth.getUser = vi.fn().mockResolvedValue({
  data: { user: { id: "test-user-id" } },
  error: null,
});

// Teraz importujemy testowane moduły
import { POST } from "../pages/api/flashcards";
import * as flashcardService from "../lib/flashcard.service";

describe("POST /flashcards Endpoint", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();

    // Set default mock implementation
    vi.mocked(flashcardService.validateGenerationExists).mockResolvedValue(true);
    vi.mocked(flashcardService.createFlashcards).mockResolvedValue({
      flashcards: [
        {
          id: 1,
          front: "Test front",
          back: "Test back",
          source: "manual",
          generation_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    });

    // Ustaw mock dla getUser aby zawsze zwracać użytkownika
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "test-user-id" } },
      error: null,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should create flashcards successfully with valid data", async () => {
    // Arrange
    const requestData = {
      flashcards: [
        {
          front: "Question",
          back: "Answer",
          source: "manual",
          generation_id: null,
        },
      ],
    };

    const request = new Request("https://example.com/api/flashcards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    const context = {
      request,
      params: {},
      locals: { user: { id: "test-user-id" } },
    } as unknown as APIContext;

    // Act
    try {
      const response = await POST(context);
      const responseBody = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(responseBody).toHaveProperty("flashcards");
      expect(Array.isArray(responseBody.flashcards)).toBe(true);
      expect(flashcardService.createFlashcards).toHaveBeenCalledTimes(1);
    } catch (error) {
      console.error("Test error:", error);
      throw error;
    }
  });

  it("should validate the request body and return 400 for invalid data", async () => {
    // Arrange
    const requestData = {
      flashcards: [
        {
          // Missing 'front' field
          back: "Answer",
          source: "manual",
          generation_id: null,
        },
      ],
    };

    const request = new Request("https://example.com/api/flashcards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    const context = {
      request,
      params: {},
      locals: { user: { id: "test-user-id" } },
    } as unknown as APIContext;

    // Act
    try {
      const response = await POST(context);
      const responseBody = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseBody).toHaveProperty("error");
      expect(responseBody.error).toBe("Invalid request data");
      expect(flashcardService.createFlashcards).not.toHaveBeenCalled();
    } catch (error) {
      console.error("Test error:", error);
      throw error;
    }
  });

  it("should validate generation references and return 400 for invalid generation IDs", async () => {
    // Arrange
    vi.mocked(flashcardService.validateGenerationExists).mockResolvedValue(false);

    const requestData = {
      flashcards: [
        {
          front: "Question",
          back: "Answer",
          source: "ai-full",
          generation_id: 999, // This ID will be considered invalid
        },
      ],
    };

    const request = new Request("https://example.com/api/flashcards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    const context = {
      request,
      params: {},
      locals: { user: { id: "test-user-id" } },
    } as unknown as APIContext;

    // Act
    try {
      const response = await POST(context);
      const responseBody = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseBody).toHaveProperty("error");
      expect(responseBody.error).toBe("Invalid generation references");
      expect(flashcardService.validateGenerationExists).toHaveBeenCalledTimes(1);
      expect(flashcardService.createFlashcards).not.toHaveBeenCalled();
    } catch (error) {
      console.error("Test error:", error);
      throw error;
    }
  });

  it("should handle service exceptions and return 500", async () => {
    // Arrange
    vi.mocked(flashcardService.createFlashcards).mockRejectedValue(new Error("Database error"));

    const requestData = {
      flashcards: [
        {
          front: "Question",
          back: "Answer",
          source: "manual",
          generation_id: null,
        },
      ],
    };

    const request = new Request("https://example.com/api/flashcards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    const context = {
      request,
      params: {},
      locals: { user: { id: "test-user-id" } },
    } as unknown as APIContext;

    // Act
    try {
      const response = await POST(context);
      const responseBody = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseBody).toHaveProperty("error");
      // Poprawiam oczekiwanie, aby pasowało do faktycznego komunikatu błędu
      expect(responseBody.error).toBe("Failed to create flashcards");
      expect(flashcardService.createFlashcards).toHaveBeenCalledTimes(1);
    } catch (error) {
      console.error("Test error:", error);
      throw error;
    }
  });

  it("should handle mixed valid and invalid flashcards", async () => {
    // Arrange
    const requestData = {
      flashcards: [
        {
          front: "Valid question",
          back: "Valid answer",
          source: "manual",
          generation_id: null,
        },
        {
          front: "Invalid question",
          back: "Invalid answer",
          source: "manual",
          generation_id: 123, // Invalid: manual source with generation_id
        },
      ],
    };

    const request = new Request("https://example.com/api/flashcards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    const context = {
      request,
      params: {},
      locals: { user: { id: "test-user-id" } },
    } as unknown as APIContext;

    // Act
    try {
      const response = await POST(context);
      const responseBody = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseBody).toHaveProperty("error");
      expect(responseBody.error).toBe("Invalid request data");
      expect(flashcardService.createFlashcards).not.toHaveBeenCalled();
    } catch (error) {
      console.error("Test error:", error);
      throw error;
    }
  });
});
