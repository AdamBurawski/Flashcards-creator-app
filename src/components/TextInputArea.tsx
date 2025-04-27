import type { ChangeEvent } from "react";
import { Card, CardContent } from "./ui/card";

interface TextInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  isLoading: boolean;
}

const TextInputArea = ({ value, onChange, isLoading }: TextInputAreaProps) => {
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // Obliczenie pozostałych znaków lub nadwyżki
  const textLength = value.length;
  const minLength = 1000;
  const maxLength = 10000;
  const isValid = textLength >= minLength && textLength <= maxLength;

  // Określenie statusu walidacji
  let validationStatus = "";
  let textColor = "";

  if (textLength === 0) {
    validationStatus = `Wprowadź tekst (minimum ${minLength} znaków)`;
    textColor = "text-muted-foreground";
  } else if (textLength < minLength) {
    validationStatus = `Potrzeba jeszcze ${minLength - textLength} znaków`;
    textColor = "text-amber-500";
  } else if (textLength > maxLength) {
    validationStatus = `Przekroczono o ${textLength - maxLength} znaków`;
    textColor = "text-destructive";
  } else {
    validationStatus = `Pozostało ${maxLength - textLength} znaków`;
    textColor = "text-green-600";
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label htmlFor="sourceText" className="block text-sm font-medium">
              Wprowadź tekst źródłowy
            </label>
            <span className={`text-sm ${textColor}`}>{validationStatus}</span>
          </div>

          <textarea
            id="sourceText"
            className="w-full h-64 p-3 border rounded-md resize-none bg-background"
            placeholder="Wprowadź tekst o długości od 1000 do 10000 znaków, który posłuży do wygenerowania fiszek..."
            value={value}
            onChange={handleChange}
            disabled={isLoading}
          />

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Długość tekstu: {textLength} znaków</span>
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  !isValid ? "bg-destructive" : textLength < minLength + 500 ? "bg-amber-500" : "bg-green-600"
                }`}
                style={{
                  width: `${Math.min(100, (textLength / maxLength) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TextInputArea;
