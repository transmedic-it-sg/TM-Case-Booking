import React from 'react';
import { FilterOptions, COUNTRIES } from '../../types';
import DatePicker from '../DatePicker';
import { statusOptions } from './utils';
import { getCurrentUser } from '../../utils/auth';

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
                    <select
                      value={tempFilters.submitter || ''}
                      onChange={(e) => onFilterChange('submitter', e.target.value)}
                      className="modern-filter-input"
                    >
                      <option value="">All Submitters</option>
                      {availableSubmitters.map((submitter) => (
                        <option key={submitter} value={submitter}>
                          {submitter}
                        </option>
                      ))}
                    </select>
                    <span className="filter-icon">👤</span>
                  </div>
                </div>

                <div className="modern-filter-group">
                  <label>Hospital</label>
                  <div className="filter-input-wrapper">
                    <select
                      value={tempFilters.hospital || ''}
                      onChange={(e) => onFilterChange('hospital', e.target.value)}
                      className="modern-filter-input"
                    >
                      <option value="">All Hospitals</option>
                      {availableHospitals.map((hospital) => (
                        <option key={hospital} value={hospital}>
                          {hospital}
                        </option>
                      ))}
                    </select>
                    <span className="filter-icon">🏥</span>
                  </div>
                </div>

                {currentUser?.role === 'admin' && (
                  <div className="modern-filter-group">
                    <label>Country</label>
                    <div className="filter-input-wrapper">
                      <select
                        value={tempFilters.country || ''}
                        onChange={(e) => onFilterChange('country', e.target.value)}
                        className="modern-filter-input"
                      >
                        <option value="">All Countries</option>
                        {COUNTRIES.map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
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
                    <select
                      value={tempFilters.status || ''}
                      onChange={(e) => onFilterChange('status', e.target.value)}
                      className="modern-filter-select"
                    >
                      <option value="">All Statuses</option>
                      {statusOptions.map(status => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <div className="select-arrow">▼</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Date Filters */}
            <div className="filter-category">
              <h4>📅 Date Range</h4>
              <div className="filter-row">
                <div className="modern-filter-group">
                  <DatePicker
                    label="From Date"
                    value={tempFilters.dateFrom || ''}
                    onChange={(value) => onFilterChange('dateFrom', value)}
                    placeholder="Select start date"
                    className="filter-date-picker"
                  />
                </div>

                <div className="modern-filter-group">
                  <DatePicker
                    label="To Date"
                    value={tempFilters.dateTo || ''}
                    onChange={(value) => onFilterChange('dateTo', value)}
                    placeholder="Select end date"
                    min={tempFilters.dateFrom || undefined}
                    className="filter-date-picker"
                  />
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
              onClick={() => onQuickFilter('status', 'Pending Preparation')}
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