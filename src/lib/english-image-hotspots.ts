export interface ImageVocabularyHotspot {
  id: string;
  word_en: string;
  word_pl: string;
  /** Horizontal position in percent (0-100) */
  x: number;
  /** Vertical position in percent (0-100) */
  y: number;
}

/**
 * Vocabulary hotspots mapped by dialogue image ID.
 * Coordinates are normalized percentages, so they stay responsive.
 */
const HOTSPOTS_BY_DIALOGUE: Record<string, ImageVocabularyHotspot[]> = {
  "S1-L01-D01": [
    { id: "window", word_en: "window", word_pl: "okno", x: 13, y: 22 },
    { id: "blackboard", word_en: "blackboard", word_pl: "tablica", x: 72, y: 17 },
    { id: "chair", word_en: "chair", word_pl: "krzesło", x: 86, y: 53 },
    { id: "desk", word_en: "desk", word_pl: "biurko", x: 51, y: 68 },
    { id: "pen", word_en: "pen", word_pl: "długopis", x: 55, y: 73 },
  ],
  "S1-L01-D02": [
    { id: "window", word_en: "window", word_pl: "okno", x: 10, y: 25 },
    { id: "clock", word_en: "clock", word_pl: "zegar", x: 56, y: 16 },
    { id: "blackboard", word_en: "blackboard", word_pl: "tablica", x: 89, y: 24 },
    { id: "desk", word_en: "desk", word_pl: "biurko", x: 86, y: 67 },
    { id: "box", word_en: "box", word_pl: "pudełko", x: 43, y: 80 },
  ],
  "S1-L01-D03": [
    { id: "window", word_en: "window", word_pl: "okno", x: 10, y: 11 },
    { id: "blackboard", word_en: "blackboard", word_pl: "tablica", x: 89, y: 11 },
    { id: "chair", word_en: "chair", word_pl: "krzesło", x: 77, y: 43 },
    { id: "book", word_en: "book", word_pl: "książka", x: 37, y: 62 },
    { id: "pencil", word_en: "pencil", word_pl: "ołówek", x: 69, y: 68 },
  ],
  "S1-L01-D04": [
    { id: "window", word_en: "window", word_pl: "okno", x: 10, y: 12 },
    { id: "table", word_en: "table", word_pl: "stół", x: 72, y: 33 },
    { id: "chairs", word_en: "chairs", word_pl: "krzesła", x: 48, y: 57 },
    { id: "chair_front_left", word_en: "chair", word_pl: "krzesło", x: 14, y: 60 },
    { id: "chair_front_right", word_en: "chair", word_pl: "krzesło", x: 63, y: 71 },
  ],
  "S1-L01-D05": [
    { id: "door", word_en: "door", word_pl: "drzwi", x: 6, y: 44 },
    { id: "window", word_en: "window", word_pl: "okno", x: 50, y: 24 },
    { id: "chair", word_en: "chair", word_pl: "krzesło", x: 50, y: 68 },
    { id: "desk", word_en: "desk", word_pl: "biurko", x: 50, y: 74 },
    { id: "pencil", word_en: "pencil", word_pl: "ołówek", x: 51, y: 78 },
  ],
};

export function getDialogueImageHotspots(dialogueId?: string): ImageVocabularyHotspot[] {
  if (!dialogueId) return [];
  return HOTSPOTS_BY_DIALOGUE[dialogueId] ?? [];
}
