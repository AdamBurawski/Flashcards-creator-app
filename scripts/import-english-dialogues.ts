/**
 * Script: Import English Dialogues from JSONL
 *
 * Reads a JSONL file containing English dialogue data and upserts records
 * into the `english_dialogues` table in Supabase.
 *
 * Usage:
 *   npx tsx scripts/import-english-dialogues.ts <path-to-jsonl-file>
 *
 * Example:
 *   npx tsx scripts/import-english-dialogues.ts src/english_module/rozmowki_stage1_lessons1-9.jsonl
 *
 * Environment variables required:
 *   SUPABASE_URL or PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (service role key for bypassing RLS)
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// ============================================================================
// Validation schemas
// ============================================================================

const teacherTurnSchema = z.object({
  role: z.literal("teacher"),
  text: z.string().min(1, "Teacher text cannot be empty"),
  repeat: z.boolean(),
  hint: z.string().optional(),
});

const studentTurnSchema = z.object({
  role: z.literal("student"),
  text: z.string().min(1, "Student text cannot be empty"),
  accept: z.array(z.string()).min(1, "Accept array must have at least one entry"),
});

const turnSchema = z.discriminatedUnion("role", [teacherTurnSchema, studentTurnSchema]);

const dialogueRecordSchema = z.object({
  id: z
    .string()
    .regex(/^S\d+-L\d{2}-D\d{2}$/, 'ID must match format "S{stage}-L{lesson:02d}-D{dialogue:02d}"'),
  stage: z.number().int().min(1).max(12),
  lesson: z.number().int().positive(),
  level: z.enum(["A1", "A2", "B1", "B2"]),
  title: z.string().min(1),
  tags: z.array(z.string()),
  target_vocab: z.array(z.string()),
  target_structures: z.array(z.string()),
  turns: z
    .array(turnSchema)
    .min(2, "Dialogue must have at least 2 turns")
    .refine(
      (turns) => turns.length % 2 === 0,
      "Turns array must have an even number of elements (alternating teacher/student)"
    )
    .refine((turns) => {
      // Verify alternating teacher/student pattern
      for (let i = 0; i < turns.length; i++) {
        const expectedRole = i % 2 === 0 ? "teacher" : "student";
        if (turns[i].role !== expectedRole) {
          return false;
        }
      }
      return true;
    }, "Turns must alternate between teacher and student, starting with teacher"),
  revision_from: z.array(z.string()).default([]),
  estimated_duration_seconds: z.number().int().positive().optional(),
  sort_order: z.number().int().optional(),
});

type DialogueRecord = z.infer<typeof dialogueRecordSchema>;

// ============================================================================
// Supabase client setup (service role for bypassing RLS)
// ============================================================================

function createSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    console.error("Error: SUPABASE_URL or PUBLIC_SUPABASE_URL environment variable is required.");
    process.exit(1);
  }

  if (!serviceRoleKey) {
    console.error("Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required.");
    console.error("The service role key is needed to bypass RLS for data import.");
    process.exit(1);
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================================
// JSONL parsing
// ============================================================================

function parseJsonlFile(filePath: string): { records: DialogueRecord[]; errors: string[] } {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: File not found: ${absolutePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(absolutePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim() !== "");

  const records: DialogueRecord[] = [];
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i].trim();

    try {
      const parsed = JSON.parse(line);
      const result = dialogueRecordSchema.safeParse(parsed);

      if (result.success) {
        records.push(result.data);
      } else {
        const errorMessages = result.error.errors.map((e) => `  - ${e.path.join(".")}: ${e.message}`).join("\n");
        errors.push(`Line ${lineNumber} (ID: ${parsed.id || "unknown"}): Validation failed:\n${errorMessages}`);
      }
    } catch {
      errors.push(`Line ${lineNumber}: Invalid JSON`);
    }
  }

  return { records, errors };
}

// ============================================================================
// Database upsert
// ============================================================================

async function upsertDialogues(
  records: DialogueRecord[]
): Promise<{ inserted: number; updated: number; errors: string[] }> {
  const supabase = createSupabaseAdmin();
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const record of records) {
    // Check if record already exists
    const { data: existing } = await supabase
      .from("english_dialogues")
      .select("id")
      .eq("id", record.id)
      .single();

    const isUpdate = existing !== null;

    const { error } = await supabase.from("english_dialogues").upsert(
      {
        id: record.id,
        stage: record.stage,
        lesson: record.lesson,
        level: record.level,
        title: record.title,
        tags: record.tags,
        target_vocab: record.target_vocab,
        target_structures: record.target_structures,
        turns: record.turns,
        revision_from: record.revision_from,
        estimated_duration_seconds: record.estimated_duration_seconds ?? null,
        sort_order: record.sort_order ?? 0,
      },
      { onConflict: "id" }
    );

    if (error) {
      errors.push(`${record.id}: ${error.message}`);
    } else if (isUpdate) {
      updated++;
    } else {
      inserted++;
    }
  }

  return { inserted, updated, errors };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: npx tsx scripts/import-english-dialogues.ts <path-to-jsonl-file>");
    console.error("Example: npx tsx scripts/import-english-dialogues.ts src/english_module/rozmowki_stage1_lessons1-9.jsonl");
    process.exit(1);
  }

  const filePath = args[0];
  console.log(`\n📂 Reading JSONL file: ${filePath}`);

  // Parse and validate
  const { records, errors: parseErrors } = parseJsonlFile(filePath);

  console.log(`\n📊 Parse results:`);
  console.log(`   Valid records: ${records.length}`);
  console.log(`   Parse errors:  ${parseErrors.length}`);

  if (parseErrors.length > 0) {
    console.log(`\n⚠️  Parse errors:`);
    parseErrors.forEach((e) => console.log(`   ${e}`));
  }

  if (records.length === 0) {
    console.error("\n❌ No valid records to import. Aborting.");
    process.exit(1);
  }

  // Import to database
  console.log(`\n📤 Importing ${records.length} records to database...`);
  const { inserted, updated, errors: dbErrors } = await upsertDialogues(records);

  console.log(`\n✅ Import complete:`);
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Updated:  ${updated}`);
  console.log(`   Errors:   ${dbErrors.length}`);

  if (dbErrors.length > 0) {
    console.log(`\n⚠️  Database errors:`);
    dbErrors.forEach((e) => console.log(`   ${e}`));
  }

  // Summary
  const totalErrors = parseErrors.length + dbErrors.length;
  if (totalErrors > 0) {
    console.log(`\n⚠️  Completed with ${totalErrors} error(s).`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All records imported successfully!`);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
