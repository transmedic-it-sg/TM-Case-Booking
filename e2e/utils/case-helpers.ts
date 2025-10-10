import { Page, expect } from '@playwright/test';

export class CaseHelpers {
  constructor(private page: Page) {}

  async navigateToCaseBooking() {
    await this.page.click('[data-testid="new-case-button"]');
    await expect(this.page.locator('[data-testid="case-booking-form"]')).toBeVisible();
  }

  async fillBasicCaseInfo(caseData: {
    hospital?: string;
    dateOfSurgery?: string;
    doctor?: string;
    procedureType?: string;
    procedureName?: string;
  }) {
    if (caseData.hospital) {
      await this.page.selectOption('select[name="hospital"]', caseData.hospital);
    }
    
    if (caseData.dateOfSurgery) {
      await this.page.fill('input[name="dateOfSurgery"]', caseData.dateOfSurgery);
    }
    
    if (caseData.doctor) {
      await this.page.selectOption('select[name="doctor"]', caseData.doctor);
    }
    
    if (caseData.procedureType) {
      await this.page.selectOption('select[name="procedureType"]', caseData.procedureType);
    }
    
    if (caseData.procedureName) {
      await this.page.selectOption('select[name="procedureName"]', caseData.procedureName);
    }
  }

  async addSurgerySet(setName: string, quantity: number = 1) {
    // Click on Surgery Sets tab
    await this.page.click('[data-testid="surgery-sets-tab"]');
    
    // Find the set and add it
    const setRow = this.page.locator(`[data-testid="surgery-set-${setName}"]`);
    await expect(setRow).toBeVisible();
    
    // Set quantity
    await setRow.locator('input[type="number"]').fill(quantity.toString());
    
    // Add to case
    await setRow.locator('[data-testid="add-set-button"]').click();
  }

  async addImplantBox(boxName: string, quantity: number = 1) {
    // Click on Implant Boxes tab
    await this.page.click('[data-testid="implant-boxes-tab"]');
    
    // Find the box and add it
    const boxRow = this.page.locator(`[data-testid="implant-box-${boxName}"]`);
    await expect(boxRow).toBeVisible();
    
    // Set quantity
    await boxRow.locator('input[type="number"]').fill(quantity.toString());
    
    // Add to case
    await boxRow.locator('[data-testid="add-box-button"]').click();
  }

  async submitCase() {
    await this.page.click('[data-testid="submit-case-button"]');
  }

  async expectCaseCreationSuccess() {
    // Should show success message
    await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 15000 });
    
    // Should redirect to cases list or show the new case
    await expect(this.page.locator('[data-testid="cases-list"]')).toBeVisible({ timeout: 10000 });
  }

  async expectCaseCreationError() {
    // Should show error message
    await expect(this.page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10000 });
  }

  async openCaseCard(caseReferenceNumber: string) {
    const caseCard = this.page.locator(`[data-testid="case-card-${caseReferenceNumber}"]`);
    await expect(caseCard).toBeVisible();
    await caseCard.click();
  }

  async verifyCaseQuantitiesVisible(caseReferenceNumber: string) {
    const caseCard = this.page.locator(`[data-testid="case-card-${caseReferenceNumber}"]`);
    await expect(caseCard).toBeVisible();
    
    // Check if quantities are displayed
    const quantityElements = caseCard.locator('[data-testid*="quantity"]');
    await expect(quantityElements.first()).toBeVisible();
    
    // Verify quantity text is not empty
    const quantityText = await quantityElements.first().textContent();
    expect(quantityText).not.toBe('');
    expect(quantityText).not.toBe('0');
  }

  async amendCase(caseReferenceNumber: string, amendments: {
    doctor?: string;
    procedureType?: string;
    procedureName?: string;
    notes?: string;
  }) {
    // Open case card
    await this.openCaseCard(caseReferenceNumber);
    
    // Click amend button
    await this.page.click('[data-testid="amend-case-button"]');
    
    // Wait for amendment form
    await expect(this.page.locator('[data-testid="amendment-form"]')).toBeVisible();
    
    // Fill amendment fields
    if (amendments.doctor) {
      await this.page.selectOption('select[name="doctor"]', amendments.doctor);
    }
    
    if (amendments.procedureType) {
      await this.page.selectOption('select[name="procedureType"]', amendments.procedureType);
    }
    
    if (amendments.procedureName) {
      await this.page.selectOption('select[name="procedureName"]', amendments.procedureName);
    }
    
    if (amendments.notes) {
      await this.page.fill('textarea[name="notes"]', amendments.notes);
    }
    
    // Submit amendment
    await this.page.click('[data-testid="submit-amendment-button"]');
  }

  async verifyAmendmentHistory(caseReferenceNumber: string) {
    await this.openCaseCard(caseReferenceNumber);
    
    // Click history tab or button
    await this.page.click('[data-testid="amendment-history-tab"]');
    
    // Verify history is displayed
    await expect(this.page.locator('[data-testid="amendment-history-list"]')).toBeVisible();
    
    // Verify at least one amendment entry exists
    const historyItems = this.page.locator('[data-testid="amendment-history-item"]');
    await expect(historyItems.first()).toBeVisible();
  }

  async attachFile(caseReferenceNumber: string, filePath: string) {
    await this.openCaseCard(caseReferenceNumber);
    
    // Click attach file button
    await this.page.click('[data-testid="attach-file-button"]');
    
    // Upload file
    await this.page.setInputFiles('input[type="file"]', filePath);
    
    // Submit attachment
    await this.page.click('[data-testid="submit-attachment-button"]');
  }

  async verifyAttachmentExists(caseReferenceNumber: string, fileName: string) {
    await this.openCaseCard(caseReferenceNumber);
    
    // Verify attachment is listed
    const attachment = this.page.locator(`[data-testid="attachment-${fileName}"]`);
    await expect(attachment).toBeVisible();
  }
}