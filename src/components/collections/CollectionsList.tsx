import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { formatDate } from "../../lib/date-helpers";
import type { Collection } from "../../types"; // Import typu

// Definicja interfejsu Collection została przeniesiona do src/types.ts
// interface Collection {
//   id: number;
//   name: string;
//   description: string;
//   created_at: string;
//   updated_at: string;
//   flashcard_count: number;
// }

interface CollectionsListProps {
  collections: Collection[];
}

// Komponent pomocniczy dla pojedynczej karty kolekcji
function CollectionCard({ collection }: { collection: Collection }) {
  const [formattedDate, setFormattedDate] = useState(collection.updated_at); // Początkowo data w formacie ISO

  useEffect(() => {
    // Formatowanie daty następuje tylko po stronie klienta
    setFormattedDate(formatDate(collection.updated_at));
  }, [collection.updated_at]); // Efekt uruchamia się, gdy zmienia się collection.updated_at

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-medium">{collection.name}</h3>
        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">{collection.flashcard_count} fiszek</span>
      </div>

      {collection.description && <p className="text-gray-600 text-sm mt-2">{collection.description}</p>}

      {/* Wyświetlanie sformatowanej daty */}
      <div className="mt-3 text-xs text-gray-500">Ostatnia aktualizacja: {formattedDate}</div>

      <div className="mt-4 flex justify-between">
        <Button variant="outline" size="sm" asChild>
          <a href={`/collections/${collection.id}`}>Przeglądaj</a>
        </Button>

        <Button variant="outline" size="sm" asChild>
          <a href={`/learn/collection/${collection.id}`}>Sprawdź się</a>
        </Button>
      </div>
    </div>
  );
}

export default function CollectionsList({ collections }: CollectionsListProps) {
  // Zabezpieczamy się przed null i undefined
  const safeCollections = Array.isArray(collections) ? collections : [];

  // Jeśli nie ma żadnych kolekcji
  if (safeCollections.length === 0) {
    return (
      <div className="p-6 border border-gray-200 rounded-lg text-center">
        <h3 className="text-lg font-medium mb-2">Brak kolekcji</h3>
        <p className="text-gray-600 mb-4">
          Nie masz jeszcze żadnych kolekcji. Utwórz swoją pierwszą kolekcję za pomocą przycisku poniżej.
        </p>
      </div>
    );
  }

  // Gdy są kolekcje, wyświetl je
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {safeCollections.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </div>
  );
}
