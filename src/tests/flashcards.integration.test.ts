import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../pages/api/flashcards";
import * as flashcardService from "../lib/flashcard.service";
import type { APIContext } from "astro";

// Mock the flashcard service
vi.mock("../lib/flashcard.service", () => ({
  createFlashcards: vi.fn(),
  validateGenerationExists: vi.fn(),
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
    } as APIContext;

    // Act
    const response = await POST(context);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(201);
    expect(responseBody).toHaveProperty("flashcards");
    expect(Array.isArray(responseBody.flashcards)).toBe(true);
    expect(flashcardService.createFlashcards).toHaveBeenCalledTimes(1);
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
    } as APIContext;

    // Act
    const response = await POST(context);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(responseBody).toHaveProperty("error");
    expect(responseBody.error).toBe("Invalid request data");
    expect(flashcardService.createFlashcards).not.toHaveBeenCalled();
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
    } as APIContext;

    // Act
    const response = await POST(context);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(responseBody).toHaveProperty("error");
    expect(responseBody.error).toBe("Invalid generation references");
    expect(flashcardService.validateGenerationExists).toHaveBeenCalledTimes(1);
    expect(flashcardService.createFlashcards).not.toHaveBeenCalled();
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
    } as APIContext;

    // Act
    const response = await POST(context);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(responseBody).toHaveProperty("error");
    expect(responseBody.error).toBe("Failed to create flashcards");
    expect(flashcardService.createFlashcards).toHaveBeenCalledTimes(1);
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
    } as APIContext;

    // Act
    const response = await POST(context);
    const responseBody = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(responseBody).toHaveProperty("error");
    expect(responseBody.error).toBe("Invalid request data");
    expect(flashcardService.createFlashcards).not.toHaveBeenCalled();
  });
});
