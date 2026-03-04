-- Add intro column to english_dialogues table
-- Stores Polish context narration and optional demo dialogue shown before the exercise.
-- Structure: { narrator_pl: string, narrator_audio_url?: string, demo?: [{role, text, audio_url?}] }
ALTER TABLE english_dialogues
  ADD COLUMN IF NOT EXISTS intro jsonb;

COMMENT ON COLUMN english_dialogues.intro IS
  'Optional intro context shown before the exercise: Polish narration and modelled demo dialogue. '
  'Structure: { narrator_pl: string, narrator_audio_url?: string, demo?: Array<{role: "teacher"|"peer", text: string, audio_url?: string}> }';
