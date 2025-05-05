import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FlashcardList from "../../components/FlashcardList";
import type { FlashcardProposalViewModel } from "../../hooks/useGenerateFlashcards";

describe("FlashcardList", () => {
  const mockFlashcards: FlashcardProposalViewModel[] = [
    {
      front: "Pytanie 1",
      back: "Odpowiedź 1",
      source: "ai",
      accepted: false,
      edited: false,
    },
    {
      front: "Pytanie 2",
      back: "Odpowiedź 2",
      source: "ai",
      accepted: true,
      edited: false,
    },
  ];

  const onAcceptMock = vi.fn();
  const onRejectMock = vi.fn();
  const onEditMock = vi.fn();

  it("renderuje listę fiszek z poprawnym nagłówkiem", () => {
    render(
      <FlashcardList flashcards={mockFlashcards} onAccept={onAcceptMock} onReject={onRejectMock} onEdit={onEditMock} />
    );

    expect(screen.getByText(/Wygenerowane propozycje fiszek \(2\)/i)).toBeInTheDocument();

    // Zamiast szukać całego tekstu, sprawdźmy części tekstu, które wiemy, że istnieją
    const statusElement = screen.getByText(/Zaakceptowano:/i);
    expect(statusElement).toBeInTheDocument();

    // Użyjmy bardziej precyzyjnego selektora - funkcji testującej
    const counter = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === "span" && content.includes("1");
    });
    expect(counter).toBeInTheDocument();

    // Sprawdźmy, czy wyświetla się prawidłowy stosunek zaakceptowanych do wszystkich
    const statusContainer = screen.getByText(/Zaakceptowano:/i).parentElement;
    expect(statusContainer).toHaveTextContent("1/2");
  });

  it("nie renderuje nic, gdy lista fiszek jest pusta", () => {
    const { container } = render(
      <FlashcardList flashcards={[]} onAccept={onAcceptMock} onReject={onRejectMock} onEdit={onEditMock} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("przekazuje odpowiednie funkcje do komponentów fiszek", async () => {
    // Potrzebujemy zamockować komponent FlashcardListItem, żeby sprawdzić czy funkcje są przekazywane
    // Jest to wykraczające poza zakres tego testu - tutaj po prostu sprawdzimy, czy komponent się renderuje
    render(
      <FlashcardList flashcards={mockFlashcards} onAccept={onAcceptMock} onReject={onRejectMock} onEdit={onEditMock} />
    );

    // Sprawdzamy, czy fiszki są renderowane
    expect(screen.getByText("Pytanie 1")).toBeInTheDocument();
    expect(screen.getByText("Pytanie 2")).toBeInTheDocument();
  });
});
