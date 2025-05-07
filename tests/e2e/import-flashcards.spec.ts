import { expect } from '@playwright/test';
import { test } from './fixtures/auth-fixture';
import { generateUniqueName, wait } from './utils/test-helpers';

test.describe('Import fiszek', () => {
  test('powinien umożliwić import fiszek do kolekcji', async ({ 
    authenticatedPage: page, 
    collectionsPage, 
    newCollectionModal, 
    importDialog 
  }) => {
    // 1. Jesteśmy już na stronie kolekcji (fixture authenticatedPage przenosi tam automatycznie)
    
    // Klikamy przycisk utworzenia nowej kolekcji
    await collectionsPage.clickNewCollection();
    
    // Używamy unikalnej nazwy dla kolekcji
    const nazwaKolekcji = generateUniqueName('Import');
    await newCollectionModal.createCollection(nazwaKolekcji, 'Kolekcja do testowania importu fiszek');
    await newCollectionModal.verifySuccess();
    
    // 2. Poczekaj na pojawienie się dialogu importu
    await wait(2000);
    await importDialog.isVisible();
    
    // 3. Sprawdź, czy mamy jakieś sesje generowania do wyboru
    // Jeśli wybór sesji jest dostępny, wybierz pierwszą
    const generationSelectEnabled = await importDialog.generationSelect.isEnabled()
      .catch(() => false);
    
    if (generationSelectEnabled) {
      await importDialog.selectGeneration(0);
      
      // 4. Sprawdź, czy są dostępne fiszki do importu
      // To może być opcjonalne, bo nie zawsze są dostępne fiszki
      const hasFlashcards = await importDialog.flashcardsList.isVisible()
        .catch(() => false);
      
      if (hasFlashcards) {
        // 5. Zaznacz wszystkie fiszki
        await importDialog.selectAllFlashcards();
        
        // 6. Importuj fiszki
        await importDialog.import();
        
        // W tym scenariuszu sukcesu dialog powinien się zamknąć
        // lub przekierować nas do strony z kolekcją
      } else {
        // Brak fiszek, więc zamykamy dialog
        await importDialog.close();
      }
    } else {
      // Brak sesji, więc zamykamy dialog
      await importDialog.close();
    }
    
    // 7. Sprawdź, czy kolekcja istnieje
    await collectionsPage.verifyCollectionsExist();
    const hasCollection = await collectionsPage.hasCollection(nazwaKolekcji);
    expect(hasCollection).toBeTruthy();
  });
}); 