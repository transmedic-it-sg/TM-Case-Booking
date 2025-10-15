import { Page, expect } from '@playwright/test';

export interface TestCaseData {
  hospital?: string;
  procedureType?: string;
  department?: string;
  doctor?: string;
  country?: string;
}

export async function navigateToBookCase(page: Page) {
  const bookCaseSelectors = [
    'text=Book Case',
    'a:has-text("Book Case")',
    '[data-testid="book-case"]',
    'button:has-text("Book Case")'
  ];
  
  for (const selector of bookCaseSelectors) {
    const element = page.locator(selector);
    if (await element.isVisible()) {
      await element.click();
      await page.waitForLoadState('networkidle');
      return;
    }
  }
  
  throw new Error('Could not find Book Case navigation element');
}

export async function fillCaseForm(page: Page, caseData: TestCaseData) {
  // Fill hospital field
  if (caseData.hospital) {
    const hospitalField = page.locator('input[name="hospital"], select[name="hospital"]').first();
    if (await hospitalField.isVisible()) {
      await hospitalField.fill(caseData.hospital);
    }
  }
  
  // Fill procedure type
  if (caseData.procedureType) {
    const procedureField = page.locator('input[name="procedureType"], select[name="procedureType"]').first();
    if (await procedureField.isVisible()) {
      await procedureField.fill(caseData.procedureType);
    }
  }
  
  // Fill department
  if (caseData.department) {
    const departmentField = page.locator('input[name="department"], select[name="department"]').first();
    if (await departmentField.isVisible()) {
      await departmentField.fill(caseData.department);
    }
  }
  
  // Fill doctor
  if (caseData.doctor) {
    const doctorField = page.locator('input[name="doctor"], select[name="doctor"]').first();
    if (await doctorField.isVisible()) {
      await doctorField.fill(caseData.doctor);
    }
  }
}

export async function submitCaseForm(page: Page) {
  const submitButtons = [
    'button[type="submit"]',
    'button:has-text("Submit")',
    'button:has-text("Create")',
    '[data-testid="submit-case"]'
  ];
  
  for (const selector of submitButtons) {
    const button = page.locator(selector);
    if (await button.isVisible()) {
      await button.click();
      await page.waitForLoadState('networkidle');
      return;
    }
  }
  
  throw new Error('Could not find submit button');
}

export async function navigateToCasesList(page: Page) {
  const casesListSelectors = [
    'text=Cases',
    'a:has-text("Cases")',
    '[data-testid="cases-list"]',
    'text=Case List'
  ];
  
  for (const selector of casesListSelectors) {
    const element = page.locator(selector);
    if (await element.isVisible()) {
      await element.click();
      await page.waitForLoadState('networkidle');
      return;
    }
  }
  
  throw new Error('Could not find Cases List navigation element');
}

export async function verifyCaseExists(page: Page, caseData: TestCaseData) {
  // Wait for cases to load
  await page.waitForLoadState('networkidle');
  
  // Look for case card or row with the provided data
  if (caseData.hospital) {
    await expect(page.locator(`text=${caseData.hospital}`)).toBeVisible();
  }
  
  if (caseData.procedureType) {
    await expect(page.locator(`text=${caseData.procedureType}`)).toBeVisible();
  }
}

export async function deleteCase(page: Page, caseIdentifier: string) {
  // Look for delete button associated with the case
  const deleteSelectors = [
    `[data-testid="delete-${caseIdentifier}"]`,
    `button:has-text("Delete")`,
    `[aria-label="Delete case"]`
  ];
  
  for (const selector of deleteSelectors) {
    const element = page.locator(selector);
    if (await element.isVisible()) {
      await element.click();
      
      // Handle confirmation dialog if present
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      await page.waitForLoadState('networkidle');
      return;
    }
  }
  
  throw new Error(`Could not find delete button for case: ${caseIdentifier}`);
}