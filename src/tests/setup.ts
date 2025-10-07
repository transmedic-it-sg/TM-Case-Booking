/**
 * Comprehensive Test Setup for Real-time Overhaul Validation
 * Uses Jest + React Testing Library + MSW + Real Supabase Integration
 * 2025 Best Practices Implementation
 */

import { jest } from '@jest/globals';
import { QueryClient } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import '@testing-library/jest-dom';
import { generateTestUUID, createTestCase } from './utils/testHelpers';

// Mock the NotificationContext for tests
jest.mock('../contexts/NotificationContext', () => {
  const mockFn = () => () => {};
  return {
    useNotifications: () => ({
      notifications: [],
      unreadCount: 0,
      addNotification: mockFn(),
      markAsRead: mockFn(),
      markAllAsRead: mockFn(),
      clearNotification: mockFn(),
      clearAllNotifications: mockFn()
    }),
    NotificationProvider: ({ children }: { children: any }) => children
  };
});

// Mock the SoundContext for tests
jest.mock('../contexts/SoundContext', () => {
  const mockFn = () => () => {};
  return {
    useSound: () => ({
      isEnabled: true,
      volume: 0.5,
      toggleSound: mockFn(),
      setVolume: mockFn(),
      playSound: {
        click: mockFn(),
        success: mockFn(),
        error: mockFn(),
        notification: mockFn()
      }
    })
  };
});

// Mock auth utilities for tests
jest.mock('../utils/authCompat', () => ({
  getCurrentUser: () => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'testuser',
    name: 'Test User',
    role: 'admin',
    countries: ['Singapore'],
    selectedCountry: 'Singapore'
  }),
  getCurrentUserSync: () => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'testuser',
    name: 'Test User',
    role: 'admin',
    countries: ['Singapore'],
    selectedCountry: 'Singapore'
  })
}));

// Global test setup
beforeAll(() => {
  // Setup environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.REACT_APP_SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'http://localhost:54321';
  process.env.REACT_APP_SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'test-key';

  // Mock global objects for browser environment
  global.Notification = class MockNotification {
    constructor(title: string, options?: NotificationOptions) {}
    static permission: NotificationPermission = 'granted';
    static requestPermission = () => Promise.resolve('granted' as NotificationPermission);
  } as any;

  // Mock localStorage
  const mockLocalStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
  };

  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  });
});

// Mock Service Worker setup for API mocking
export const server = setupServer(
  // Mock Supabase API endpoints
  rest.get('*/rest/v1/case_bookings*', (req, res, ctx) => {
    return res(
      ctx.json([
        createTestCase({
          caseReferenceNumber: 'TC-2025-001',
          hospital: 'Test Hospital',
          status: 'Case Booked',
          country: 'Singapore'
        })
      ])
    );
  }),

  rest.post('*/rest/v1/case_bookings*', (req, res, ctx) => {
    return res(
      ctx.json({
        id: generateTestUUID(),
        ...(req.body as object),
        created_at: new Date().toISOString()
      })
    );
  }),

  rest.patch('*/rest/v1/case_bookings*', (req, res, ctx) => {
    return res(
      ctx.json({
        id: generateTestUUID(),
        ...(req.body as object),
        updated_at: new Date().toISOString()
      })
    );
  })
);

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Close server after all tests
afterAll(() => server.close());

// Create a fresh query client for each test
export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

// Mock console methods for cleaner test output
const originalConsole = { ...console };
beforeEach(() => {
  // Only mock console if VERBOSE_TESTS is not set
  if (!process.env.VERBOSE_TESTS) {
    const mockConsole = {
      log: () => {},
      warn: () => {},
      error: () => {}
    };
  }
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Global test utilities
export const waitFor = (callback: () => boolean | Promise<boolean>, timeout = 5000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = async () => {
      try {
        const result = await callback();
        if (result) {
          resolve();
          return;
        }
      } catch (error) {
        // Continue checking
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout after ${timeout}ms`));
        return;
      }

      setTimeout(check, 100);
    };

    check();
  });
};