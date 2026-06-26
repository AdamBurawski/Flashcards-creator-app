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
};

export function getDialogueImageHotspots(dialogueId?: string): ImageVocabularyHotspot[] {
  if (!dialogueId) return [];
  return HOTSPOTS_BY_DIALOGUE[dialogueId] ?? [];
}
