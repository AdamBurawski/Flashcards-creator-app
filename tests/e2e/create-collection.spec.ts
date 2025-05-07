import { expect } from '@playwright/test';
import { test } from './fixtures/auth-fixture';
import { generateUniqueName } from './utils/test-helpers';

test.describe('Tworzenie nowej kolekcji', () => {
  test('powinno umożliwić utworzenie nowej kolekcji', async ({ 
    authenticatedPage: page, 
    collectionsPage, 
    newCollectionModal, 
    importDialog 
  }) => {
    // Jesteśmy już na stronie kolekcji (fixture authenticatedPage przenosi tam automatycznie)
    
    // Kliknięcie w przycisk nowej kolekcji
    await collectionsPage.clickNewCollection();
    
    // Weryfikacja otwarcia modalu
    await newCollectionModal.isVisible();
    
    // Wypełnienie danych nowej kolekcji - używamy unikalnej nazwy
    const nazwaKolekcji = generateUniqueName('Kolekcja');
    await newCollectionModal.fillForm(
      nazwaKolekcji, 
      'Opis testowej kolekcji utworzonej przez test e2e'
    );
    
    // Zapisanie kolekcji
    await newCollectionModal.create();
    
    // Oczekiwanie na komunikat o sukcesie
    await newCollectionModal.verifySuccess();
    
    // Opcjonalnie: Po 1.5s pojawi się dialog importu, który zamykamy
    await page.waitForTimeout(2000);
    
    // Sprawdzenie, czy dialog importu jest widoczny
    const isImportDialogVisible = await importDialog.dialog.isVisible().catch(() => false);
    
    if (isImportDialogVisible) {
      await importDialog.close();
    }
    
    // Sprawdzenie, czy kolekcja pojawiła się na liście
    await collectionsPage.verifyCollectionsExist();
    
    // Sprawdzenie, czy nazwa kolekcji jest widoczna na liście
    const hasCollectionWithName = await collectionsPage.hasCollection(nazwaKolekcji);
    expect(hasCollectionWithName).toBeTruthy();
  });
  
  test('powinno wyświetlić błąd przy próbie utworzenia kolekcji bez nazwy', async ({ 
    authenticatedPage: page, 
    collectionsPage, 
    newCollectionModal 
  }) => {
    // Jesteśmy już na stronie kolekcji (fixture authenticatedPage przenosi tam automatycznie)
    
    // Kliknięcie w przycisk nowej kolekcji
    await collectionsPage.clickNewCollection();
    
    // Weryfikacja otwarcia modalu
    await newCollectionModal.isVisible();
    
    // Pozostawiamy puste pole nazwy i próbujemy zapisać
    await newCollectionModal.create();
    
    // Sprawdzamy, czy pojawił się komunikat o błędzie
    await newCollectionModal.verifyError();
    
    // Zamykamy modal
    await newCollectionModal.cancel();
  });
}); 