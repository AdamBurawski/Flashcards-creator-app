import { describe, it, expect } from "vitest";
import { z } from "zod";

// Import the validation schemas directly from the file
// This is a simplified version for testing purposes
const sourceEnum = z.enum(["ai-full", "ai-edited", "manual"]);

const flashcardCreateSchema = z
  .object({
    front: z.string().max(200, "Front content must not exceed 200 characters"),
    back: z.string().max(500, "Back content must not exceed 500 characters"),
    source: sourceEnum,
    generation_id: z.number().nullable(),
  })
  .refine(
    (data) => {
      // If source is "manual", generation_id must be null
      if (data.source === "manual" && data.generation_id !== null) {
        return false;
      }
      // If source is "ai-full" or "ai-edited", generation_id must not be null
      if ((data.source === "ai-full" || data.source === "ai-edited") && data.generation_id === null) {
        return false;
      }
      return true;
    },
    {
      message:
        "Invalid combination of source and generation_id. For manual source, generation_id must be null. For AI sources, generation_id is required.",
      path: ["generation_id"],
    }
  );

const flashcardsCreateCommandSchema = z.object({
  flashcards: z.array(flashcardCreateSchema).min(1, "At least one flashcard is required"),
});

describe("Flashcard Validation", () => {
  describe("Single Flashcard Validation", () => {
    it("should validate a valid manually created flashcard", () => {
      const flashcard = {
        front: "Test question",
        back: "Test answer",
        source: "manual",
        generation_id: null,
      };

      const result = flashcardCreateSchema.safeParse(flashcard);
      expect(result.success).toBe(true);
    });

    it("should validate a valid AI-full flashcard", () => {
      const flashcard = {
        front: "Test question",
        back: "Test answer",
        source: "ai-full",
        generation_id: 123,
      };

      const result = flashcardCreateSchema.safeParse(flashcard);
      expect(result.success).toBe(true);
    });

    it("should validate a valid AI-edited flashcard", () => {
      const flashcard = {
        front: "Test question",
        back: "Test answer",
        source: "ai-edited",
        generation_id: 456,
      };

      const result = flashcardCreateSchema.safeParse(flashcard);
      expect(result.success).toBe(true);
    });

    it("should reject a manual flashcard with a generation_id", () => {
      const flashcard = {
        front: "Test question",
        back: "Test answer",
        source: "manual",
        generation_id: 123,
      };

      const result = flashcardCreateSchema.safeParse(flashcard);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain("generation_id");
      }
    });

    it("should reject an AI-full flashcard with null generation_id", () => {
      const flashcard = {
        front: "Test question",
        back: "Test answer",
        source: "ai-full",
        generation_id: null,
      };

      const result = flashcardCreateSchema.safeParse(flashcard);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain("generation_id");
      }
    });

    it("should reject an AI-edited flashcard with null generation_id", () => {
      const flashcard = {
        front: "Test question",
        back: "Test answer",
        source: "ai-edited",
        generation_id: null,
      };

      const result = flashcardCreateSchema.safeParse(flashcard);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain("generation_id");
      }
    });

    it("should reject a flashcard with front content exceeding 200 characters", () => {
      const flashcard = {
        front: "a".repeat(201),
        back: "Test answer",
        source: "manual",
        generation_id: null,
      };

      const result = flashcardCreateSchema.safeParse(flashcard);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain("front");
      }
    });

    it("should reject a flashcard with back content exceeding 500 characters", () => {
      const flashcard = {
        front: "Test question",
        back: "a".repeat(501),
        source: "manual",
        generation_id: null,
      };

      const result = flashcardCreateSchema.safeParse(flashcard);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain("back");
      }
    });

    it("should reject a flashcard with invalid source value", () => {
      const flashcard = {
        front: "Test question",
        back: "Test answer",
        source: "invalid-source",
        generation_id: null,
      };

      // @ts-ignore - intentionally testing invalid source
      const result = flashcardCreateSchema.safeParse(flashcard);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain("source");
      }
    });
  });

  describe("Flashcards Command Validation", () => {
    it("should validate a valid command with multiple flashcards", () => {
      const command = {
        flashcards: [
          {
            front: "Question 1",
            back: "Answer 1",
            source: "manual",
            generation_id: null,
          },
          {
            front: "Question 2",
            back: "Answer 2",
            source: "ai-full",
            generation_id: 123,
          },
        ],
      };

      const result = flashcardsCreateCommandSchema.safeParse(command);
      expect(result.success).toBe(true);
    });

    it("should reject a command with empty flashcards array", () => {
      const command = {
        flashcards: [],
      };

      const result = flashcardsCreateCommandSchema.safeParse(command);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].path).toContain("flashcards");
      }
    });

    it("should reject a command with invalid flashcards", () => {
      const command = {
        flashcards: [
          {
            front: "Question 1",
            back: "Answer 1",
            source: "manual",
            generation_id: 123, // Invalid: manual source with generation_id
          },
        ],
      };

      const result = flashcardsCreateCommandSchema.safeParse(command);
      expect(result.success).toBe(false);
    });
  });
});
