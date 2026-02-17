-- Add image_url column to english_dialogues table
-- Stores URL to a visual context image for the dialogue (e.g. Google Drive link)
ALTER TABLE english_dialogues
  ADD COLUMN IF NOT EXISTS image_url text;

-- Add a comment explaining the column
COMMENT ON COLUMN english_dialogues.image_url IS 'URL to a visual context image for the dialogue (Google Drive, Supabase Storage, etc.)';
