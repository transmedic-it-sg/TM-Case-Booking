import React, { useState, useEffect } from 'react';
import { 
  getDepartmentsByCountry, 
  initializeCodeTables, 
  initializeCountryCodeTables,
  createCountryDepartmentId
} from '../utils/codeTable';

interface CountryGroupedDepartmentsProps {
  selectedDepartments: string[];
  onChange: (departments: string[]) => void;
  userCountries: string[]; // Required - only show user's assigned countries
  disabled?: boolean;
  compact?: boolean; // New prop for compact view
}


const CountryGroupedDepartments: React.FC<CountryGroupedDepartmentsProps> = ({
  selectedDepartments,
  onChange,
  userCountries,
  disabled = false,
  compact = false
}) => {
  const [departmentsByCountry, setDepartmentsByCountry] = useState<Record<string, string[]>>({});
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDepartments = async () => {
      setIsLoading(true);
      try {
        // Initialize code tables
        initializeCodeTables();
        
        // Initialize country tables only for user's assigned countries
        await Promise.all(
          userCountries.map(async (country) => {
            try {
              initializeCountryCodeTables(country);
              return Promise.resolve();
            } catch (error) {
              console.error(`Error initializing tables for ${country}:`, error);
              return Promise.resolve();
            }
          })
        );
        
        // Reload departments after initialization
        const updatedDepartmentsByCountry = getDepartmentsByCountry();
        
        // Only show departments for user's assigned countries
        const filteredDepartments = Object.fromEntries(
          Object.entries(updatedDepartmentsByCountry).filter(([country]) =>
            userCountries.includes(country)
          )
        );
        
        setDepartmentsByCountry(filteredDepartments);
        
        // Auto-expand countries that have selected departments
        const countriesWithSelections = new Set<string>();
        Object.entries(filteredDepartments).forEach(([country, departments]) => {
          const hasSelectedDepartments = departments.some(dept => {
            const countrySpecificId = createCountryDepartmentId(country, dept);
            return selectedDepartments.includes(countrySpecificId);
          });
          if (hasSelectedDepartments) {
            countriesWithSelections.add(country);
          }
        });
        setExpandedCountries(countriesWithSelections);
        
      } finally {
        setIsLoading(false);
      }
    };

    if (userCountries.length > 0) {
      loadDepartments();
    } else {
      // No countries selected - clear everything immediately
      setDepartmentsByCountry({});
      setExpandedCountries(new Set());
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCountries]); // selectedDepartments intentionally excluded to prevent reload loops

  const toggleCountryExpansion = (country: string) => {
    setExpandedCountries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(country)) {
        newSet.delete(country);
      } else {
        newSet.add(country);
      }
      return newSet;
    });
  };

  const handleDepartmentChange = (country: string, department: string, checked: boolean) => {
    if (disabled) return;
    
    const countrySpecificId = createCountryDepartmentId(country, department);
    
    if (checked) {
      // Add the country-specific department ID
      const newDepartments = [...selectedDepartments, countrySpecificId];
      onChange(newDepartments);
    } else {
      // Remove the country-specific department ID
      const newDepartments = selectedDepartments.filter(d => d !== countrySpecificId);
      onChange(newDepartments);
    }
  };

  const selectAllInCountry = (country: string) => {
    if (disabled) return;
    
    const countryDepartments = departmentsByCountry[country] || [];
    const countrySpecificIds = countryDepartments.map(dept => 
      createCountryDepartmentId(country, dept)
    );
    
    const newSelections = new Set([...selectedDepartments, ...countrySpecificIds]);
    onChange(Array.from(newSelections));
  };

  const deselectAllInCountry = (country: string) => {
    if (disabled) return;
    
    const countryDepartments = departmentsByCountry[country] || [];
    const countrySpecificIds = countryDepartments.map(dept => 
      createCountryDepartmentId(country, dept)
    );
    
    const newSelections = selectedDepartments.filter(dept => 
      !countrySpecificIds.includes(dept)
    );
    onChange(newSelections);
  };

  if (isLoading) {
    return (
      <div className={`country-grouped-departments loading ${compact ? 'compact' : ''}`}>
        <div style={{ textAlign: 'center', padding: compact ? '0.5rem' : '1rem', color: '#6c757d', fontSize: compact ? '0.875rem' : '1rem' }}>
          🔄 Loading departments...
        </div>
      </div>
    );
  }

  const countryEntries = Object.entries(departmentsByCountry).filter(([, departments]) => departments.length > 0);

  if (userCountries.length === 0) {
    return (
      <div className={`country-grouped-departments empty ${compact ? 'compact' : ''}`}>
        <div style={{ textAlign: 'center', padding: compact ? '1.5rem 0.75rem' : '2rem 1rem', color: '#6c757d', fontSize: compact ? '0.875rem' : '1rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>🏢</div>
          Please select countries first to see available departments
        </div>
      </div>
    );
  }

  if (countryEntries.length === 0) {
    return (
      <div className={`country-grouped-departments empty ${compact ? 'compact' : ''}`}>
        <div style={{ textAlign: 'center', padding: compact ? '1.5rem 0.75rem' : '2rem 1rem', color: '#6c757d', fontSize: compact ? '0.875rem' : '1rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>⚙️</div>
          No departments configured for selected countries
        </div>
      </div>
    );
  }

  return (
    <div className={`country-grouped-departments ${compact ? 'compact' : ''}`}>
      {!compact && (
        <div className="departments-summary">
          <span className="selected-count">
            {selectedDepartments.length} department{selectedDepartments.length !== 1 ? 's' : ''} selected
          </span>
          {selectedDepartments.length > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => onChange([])}
              disabled={disabled}
            >
              Clear All
            </button>
          )}
        </div>
      )}

      <div className="countries-list">
        {countryEntries.map(([country, departments]) => {
          const isExpanded = expandedCountries.has(country);
          const selectedInCountry = departments.filter(dept => {
            const countrySpecificId = createCountryDepartmentId(country, dept);
            return selectedDepartments.includes(countrySpecificId);
          }).length;
          const allSelectedInCountry = selectedInCountry === departments.length && departments.length > 0;
          // const someSelectedInCountry = selectedInCountry > 0 && selectedInCountry < departments.length;

          return (
            <div key={country} className="country-group">
              <div className="country-header">
                <button
                  type="button"
                  className={`country-toggle ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => toggleCountryExpansion(country)}
                  disabled={disabled}
                >
                  <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
                  <span className="country-name">🌍 {country}</span>
                  <span className="department-count">
                    ({selectedInCountry}/{departments.length})
                  </span>
                </button>
                
                <div className="country-actions">
                  {!allSelectedInCountry && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => selectAllInCountry(country)}
                      disabled={disabled}
                      title={`Select all departments in ${country}`}
                    >
                      Select All
                    </button>
                  )}
                  {selectedInCountry > 0 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => deselectAllInCountry(country)}
                      disabled={disabled}
                      title={`Deselect all departments in ${country}`}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="departments-list">
                  {departments.length === 0 ? (
                    <div className="no-departments">
                      <em>No departments configured for {country}</em>
                    </div>
                  ) : (
                    <div className="departments-grid">
                      {departments.map(department => {
                        const countrySpecificId = createCountryDepartmentId(country, department);
                        const isSelected = selectedDepartments.includes(countrySpecificId);
                        return (
                          <label key={`${country}-${department}`} className={`department-checkbox ${isSelected ? 'selected' : ''}`}>
                            <span className="department-name">{department}</span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleDepartmentChange(country, department, e.target.checked)}
                              disabled={disabled}
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default CountryGroupedDepartments;