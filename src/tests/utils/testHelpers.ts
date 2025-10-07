/**
 * Test Helper Utilities
 */

/**
 * Generate a valid UUID v4 for testing
 */
export function generateTestUUID(prefix?: string): string {
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  
  return prefix ? `${prefix}-${uuid}` : uuid;
}

/**
 * Generate multiple test UUIDs
 */
export function generateTestUUIDs(count: number, prefix?: string): string[] {
  return Array.from({ length: count }, (_, i) => 
    generateTestUUID(prefix ? `${prefix}-${i + 1}` : undefined)
  );
}

/**
 * Create a test user with valid UUID
 */
export function createTestUser(overrides?: Partial<any>) {
  return {
    id: generateTestUUID(),
    username: `testuser-${Date.now()}`,
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    role: 'doctor',
    departments: ['Test Department'],
    countries: ['Singapore'],
    enabled: true,
    created_at: new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create a test case with valid UUID
 */
export function createTestCase(overrides?: Partial<any>) {
  return {
    id: generateTestUUID(),
    caseReferenceNumber: `TC-${Date.now()}`,
    hospital: 'Test Hospital',
    status: 'Case Booked',
    country: 'Singapore',
    created_at: new Date().toISOString(),
    ...overrides
  };
}