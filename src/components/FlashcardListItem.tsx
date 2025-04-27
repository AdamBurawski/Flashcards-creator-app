import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import type { FlashcardProposalViewModel } from "./FlashcardGenerationView";

interface FlashcardListItemProps {
  flashcard: FlashcardProposalViewModel;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
  onEdit: (id: number, front: string, back: string) => void;
  index: number;
}

const FlashcardListItem = ({ flashcard, onAccept, onReject, onEdit, index }: FlashcardListItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [frontText, setFrontText] = useState(flashcard.front);
  const [backText, setBackText] = useState(flashcard.back);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Maksymalne długości tekstu dla przodu i tyłu fiszki
  const maxFrontLength = 200;
  const maxBackLength = 500;

  // Walidacja długości tekstu
  const validateText = (): boolean => {
    if (frontText.length > maxFrontLength) {
      setValidationError(`Przód fiszki nie może przekraczać ${maxFrontLength} znaków.`);
      return false;
    }

    if (backText.length > maxBackLength) {
      setValidationError(`Tył fiszki nie może przekraczać ${maxBackLength} znaków.`);
      return false;
    }

    setValidationError(null);
    return true;
  };

  // Obsługa rozpoczęcia edycji
  const handleStartEdit = () => {
    setIsEditing(true);
  };

  // Obsługa anulowania edycji
  const handleCancelEdit = () => {
    setFrontText(flashcard.front);
    setBackText(flashcard.back);
    setValidationError(null);
    setIsEditing(false);
  };

  // Obsługa zapisania edycji
  const handleSaveEdit = () => {
    if (validateText()) {
      onEdit(index, frontText, backText);
      setIsEditing(false);
    }
  };

  return (
    <Card className={`mb-4 ${flashcard.accepted ? "border-green-500" : ""}`}>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Przód fiszki */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Przód fiszki</div>
            {isEditing ? (
              <div className="space-y-1">
                <textarea
                  className="w-full p-2 border rounded-md h-24 resize-none bg-background"
                  value={frontText}
                  onChange={(e) => setFrontText(e.target.value)}
                />
                <div className="text-xs text-muted-foreground">
                  {frontText.length}/{maxFrontLength} znaków
                </div>
              </div>
            ) : (
              <div className="p-3 bg-secondary rounded-md">{flashcard.front}</div>
            )}
          </div>

          {/* Separator */}
          <div className="h-px w-full bg-border" />

          {/* Tył fiszki */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Tył fiszki</div>
            {isEditing ? (
              <div className="space-y-1">
                <textarea
                  className="w-full p-2 border rounded-md h-32 resize-none bg-background"
                  value={backText}
                  onChange={(e) => setBackText(e.target.value)}
                />
                <div className="text-xs text-muted-foreground">
                  {backText.length}/{maxBackLength} znaków
                </div>
              </div>
            ) : (
              <div className="p-3 bg-secondary rounded-md whitespace-pre-wrap">{flashcard.back}</div>
            )}
          </div>

          {/* Komunikat błędu walidacji */}
          {validationError && (
            <div className="p-2 text-sm text-destructive bg-destructive/10 rounded-md">{validationError}</div>
          )}

          {/* Przyciski akcji */}
          <div className="flex justify-end space-x-2 pt-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit}>
                  Anuluj
                </Button>
                <Button onClick={handleSaveEdit}>Zapisz zmiany</Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => onAccept(index)}
                  className={flashcard.accepted ? "bg-green-100" : ""}
                >
                  {flashcard.accepted ? "Zaakceptowano" : "Akceptuj"}
                </Button>
                <Button variant="outline" onClick={handleStartEdit}>
                  Edytuj
                </Button>
                <Button variant="destructive" onClick={() => onReject(index)}>
                  Odrzuć
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FlashcardListItem;
