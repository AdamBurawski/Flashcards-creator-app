import { supabase } from "../db/supabase.client";

export enum ErrorSource {
  FLASHCARD_CREATE = "flashcard_create",
  GENERATION = "generation",
  AUTHENTICATION = "authentication",
  DATABASE = "database",
  VALIDATION = "validation",
  SERVER_ERROR = "server_error",
}

export interface ErrorLogEntry {
  source: ErrorSource;
  error_code: string;
  error_message: string;
  user_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Logs an error to the console and optionally to the database
 * @param entry The error log entry to record
 * @param saveToDb Whether to persist the error in the database (defaults to false since table doesn't exist)
 */
export async function logError(entry: ErrorLogEntry, saveToDb: boolean = false): Promise<void> {
  // Always log to console
  console.error(`[${entry.source}] Error ${entry.error_code}: ${entry.error_message}`, entry.metadata || "");

  // Skip database logging since table doesn't exist in schema
  if (!saveToDb) {
    return;
  }

  // Database logging implementation would go here if table existed
  // For now, this is disabled until database schema is updated
}
