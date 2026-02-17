/**
 * Script: Update Dialogue Images from JSON mapping file
 *
 * Reads a JSON file mapping dialogue IDs to image URLs and updates
 * the `image_url` column in the `english_dialogues` table.
 *
 * Usage:
 *   npx tsx scripts/update-dialogue-images.ts <path-to-json-file>
 *
 * Example JSON file format:
 *   {
 *     "S1-L01-D01": "https://drive.google.com/uc?export=view&id=FILE_ID_1",
 *     "S1-L01-D02": "https://drive.google.com/uc?export=view&id=FILE_ID_2",
 *     ...
 *   }
 *
 * Environment variables required:
 *   SUPABASE_URL or PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

function createSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    console.error("Error: SUPABASE_URL or PUBLIC_SUPABASE_URL environment variable is required.");
    process.exit(1);
  }

  if (!serviceRoleKey) {
    console.error("Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required.");
    process.exit(1);
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: npx tsx scripts/update-dialogue-images.ts <path-to-json-file>");
    console.error("\nExpected JSON format:");
    console.error('  { "S1-L01-D01": "https://drive.google.com/uc?export=view&id=...", ... }');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  let mapping: Record<string, string>;

  try {
    mapping = JSON.parse(content);
  } catch {
    console.error("Error: Invalid JSON in mapping file");
    process.exit(1);
  }

  const entries = Object.entries(mapping);
  console.log(`\n🖼️  Updating images for ${entries.length} dialogues...\n`);

  const supabase = createSupabaseAdmin();
  let updated = 0;
  let notFound = 0;
  const errors: string[] = [];

  for (const [dialogueId, imageUrl] of entries) {
    const { error, count } = await supabase
      .from("english_dialogues")
      .update({ image_url: imageUrl })
      .eq("id", dialogueId);

    if (error) {
      errors.push(`${dialogueId}: ${error.message}`);
    } else if (count === 0) {
      notFound++;
      console.log(`  ⚠️  ${dialogueId}: not found in database`);
    } else {
      updated++;
      console.log(`  ✅ ${dialogueId}: updated`);
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   Updated:   ${updated}`);
  console.log(`   Not found: ${notFound}`);
  console.log(`   Errors:    ${errors.length}`);

  if (errors.length > 0) {
    console.log(`\n❌ Errors:`);
    errors.forEach((e) => console.log(`   ${e}`));
  }

  console.log("\n✅ Done!");
}

main().catch(console.error);
