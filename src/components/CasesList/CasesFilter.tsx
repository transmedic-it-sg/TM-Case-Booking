import React from 'react';
import { FilterOptions, COUNTRIES } from '../../types';
import FilterDatePicker from '../FilterDatePicker';
import { statusOptions } from './utils';
import { getCurrentUser } from '../../utils/auth';
import SearchableDropdown from '../SearchableDropdown';

interface CasesFilterProps {
  filters: FilterOptions;
  tempFilters: FilterOptions;
  showFilters: boolean;
  availableSubmitters: string[];
  availableHospitals: string[];
  filteredCasesCount: number;
  totalCasesCount: number;
  onFilterChange: (field: keyof FilterOptions, value: string) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  onToggleFilters: () => void;
  onQuickFilter: (filterKey: string, filterValue: string) => void;
}

const CasesFilter: React.FC<CasesFilterProps> = ({
  filters,
  tempFilters,
  showFilters,
  availableSubmitters,
  availableHospitals,
  filteredCasesCount,
  totalCasesCount,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
  onToggleFilters,
  onQuickFilter
}) => {
  const currentUser = getCurrentUser();
  return (
    <div className="modern-filters-section">
      <div className="filters-header" onClick={onToggleFilters}>
        <div className="filters-title">
          <h3>🔍 Advanced Filters</h3>
          <span className="active-filters-count">
            {Object.keys(filters).length > 0 && `(${Object.keys(filters).length} active)`}
          </span>
        </div>
        <button className={`btn btn-outline-secondary btn-sm filters-toggle ${showFilters ? 'expanded' : ''}`}>
          {showFilters ? '▲' : '▼'}
        </button>
      </div>
      
      {showFilters && (
        <div className="filters-content">
          <div className="filters-grid">
            {/* Search Filters */}
            <div className="filter-category">
              <h4>🔎 Search</h4>
              <div className="filter-row">
                <div className="modern-filter-group">
                  <label>Submitter</label>
                  <div className="filter-input-wrapper">
                    <SearchableDropdown
                      options={[
                        { value: '', label: 'All Submitters' },
                        ...availableSubmitters.map(submitter => ({
                          value: submitter,
                          label: submitter
                        }))
                      ]}
                      value={tempFilters.submitter || ''}
                      onChange={(value) => onFilterChange('submitter', value)}
                      placeholder="All Submitters"
                    />
                    <span className="filter-icon">👤</span>
                  </div>
                </div>

                <div className="modern-filter-group">
                  <label>Hospital</label>
                  <div className="filter-input-wrapper">
                    <SearchableDropdown
                      options={[
                        { value: '', label: 'All Hospitals' },
                        ...availableHospitals.map(hospital => ({
                          value: hospital,
                          label: hospital
                        }))
                      ]}
                      value={tempFilters.hospital || ''}
                      onChange={(value) => onFilterChange('hospital', value)}
                      placeholder="All Hospitals"
                    />
                    <span className="filter-icon">🏥</span>
                  </div>
                </div>

                {currentUser?.role === 'admin' && (
                  <div className="modern-filter-group">
                    <label>Country</label>
                    <div className="filter-input-wrapper">
                      <SearchableDropdown
                        options={[
                          { value: '', label: 'All Countries' },
                          ...COUNTRIES.map(country => ({
                            value: country,
                            label: country
                          }))
                        ]}
                        value={tempFilters.country || ''}
                        onChange={(value) => onFilterChange('country', value)}
                        placeholder="All Countries"
                      />
                      <span className="filter-icon">🌍</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status Filter */}
            <div className="filter-category">
              <h4>📊 Status</h4>
              <div className="filter-row">
                <div className="modern-filter-group full-width">
                  <label>Case Status</label>
                  <div className="status-filter-wrapper">
                    <SearchableDropdown
                      options={[
                        { value: '', label: 'All Statuses' },
                        ...statusOptions.map(status => ({
                          value: status,
                          label: status
                        }))
                      ]}
                      value={tempFilters.status || ''}
                      onChange={(value) => onFilterChange('status', value)}
                      placeholder="All Statuses"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Date Filters */}
            <div className="filter-category">
              <h4>📅 Date Range</h4>
              <div className="filter-row">
                <div className="modern-filter-group">
                  <label>Start Date</label>
                  <div className="filter-input-wrapper">
                    <FilterDatePicker
                      value={tempFilters.dateFrom || ''}
                      onChange={(value) => onFilterChange('dateFrom', value)}
                      placeholder="Select start date 📅"
                    />
                  </div>
                </div>

                <div className="modern-filter-group">
                  <label>End Date</label>
                  <div className="filter-input-wrapper">
                    <FilterDatePicker
                      value={tempFilters.dateTo || ''}
                      onChange={(value) => onFilterChange('dateTo', value)}
                      placeholder="Select end date 📅"
                      min={tempFilters.dateFrom || undefined}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="modern-filter-actions">
            <div className="filter-stats">
              Showing {filteredCasesCount} of {totalCasesCount} cases
            </div>
            <div className="filter-buttons">
              <button 
                onClick={onClearFilters} 
                className="btn btn-outline-secondary btn-md modern-clear-button"
                disabled={Object.keys(tempFilters).length === 0}
              >
                🗑️ Clear All
              </button>
              <button 
                onClick={onApplyFilters} 
                className="btn btn-primary btn-md modern-apply-button"
              >
                ✨ Apply Filters
              </button>
            </div>
          </div>

          {/* Quick Filter Presets */}
          <div className="quick-filters">
            <span className="quick-filters-label">Quick Filters:</span>
            <button 
              onClick={() => onQuickFilter('status', 'Case Booked')}
              className="btn btn-outline-secondary btn-sm quick-filter-button"
            >
              📋 New Cases
            </button>
            <button 
              onClick={() => onQuickFilter('status', 'Order Preparation')}
              className="btn btn-outline-secondary btn-sm quick-filter-button"
            >
              ⏳ Pending
            </button>
            <button 
              onClick={() => onQuickFilter('status', 'Case Completed')}
              className="btn btn-outline-secondary btn-sm quick-filter-button"
            >
              ✅ Completed
            </button>
            <button 
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                onQuickFilter('dateFrom', today);
                onQuickFilter('dateTo', today);
              }}
              className="btn btn-outline-secondary btn-sm quick-filter-button"
            >
              📅 Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CasesFilter;