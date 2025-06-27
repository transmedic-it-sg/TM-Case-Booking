// Debug utility for Code Tables
import { initializeCodeTables, initializeCountryCodeTables } from './codeTable';
import { COUNTRIES } from '../types';

export const debugCodeTables = () => {
  console.log('=== CODE TABLES DEBUG INFO ===');
  
  // Check global tables
  console.log('Global Storage (codeTables):');
  const globalData = localStorage.getItem('codeTables');
  if (globalData) {
    try {
      const parsed = JSON.parse(globalData);
      console.log('Global tables:', parsed);
      parsed.forEach((table: any) => {
        console.log(`  ${table.id}: ${table.items.length} items`);
      });
    } catch (error) {
      console.error('Error parsing global tables:', error);
    }
  } else {
    console.log('No global tables found');
  }

  // Check country-specific tables
  COUNTRIES.forEach(country => {
    const countryData = localStorage.getItem(`codeTables-${country}`);
    if (countryData) {
      try {
        const parsed = JSON.parse(countryData);
        console.log(`${country} tables:`, parsed);
        parsed.forEach((table: any) => {
          console.log(`  ${table.id}: ${table.items.length} items`);
        });
      } catch (error) {
        console.error(`Error parsing ${country} tables:`, error);
      }
    }
  });

  console.log('=== END DEBUG INFO ===');
};

export const clearAllCodeTables = () => {
  console.log('Clearing all code table data...');
  
  // Clear global tables
  localStorage.removeItem('codeTables');
  
  // Clear all country-specific tables
  COUNTRIES.forEach(country => {
    localStorage.removeItem(`codeTables-${country}`);
  });
  
  console.log('All code table data cleared');
};

export const reinitializeAllCodeTables = () => {
  console.log('Reinitializing all code tables...');
  
  // Clear existing data
  clearAllCodeTables();
  
  // Reinitialize global tables
  initializeCodeTables();
  
  // Reinitialize country tables for all countries
  COUNTRIES.forEach(country => {
    initializeCountryCodeTables(country);
  });
  
  console.log('All code tables reinitialized');
  debugCodeTables();
};

// Make functions available on window for debugging
if (typeof window !== 'undefined') {
  (window as any).debugCodeTables = debugCodeTables;
  (window as any).clearAllCodeTables = clearAllCodeTables;
  (window as any).reinitializeAllCodeTables = reinitializeAllCodeTables;
}