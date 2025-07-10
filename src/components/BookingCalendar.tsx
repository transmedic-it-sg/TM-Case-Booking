import React, { useState, useEffect, useRef } from 'react';
import { 
  getDepartments, 
  getCodeTables,
  getDepartmentNamesForUser,
  getCountries
} from '../utils/codeTable';
import { getCurrentUser } from '../utils/auth';
import { getCases } from '../utils/storage';
import { CaseBooking, COUNTRIES } from '../types';
import SearchableDropdown from './SearchableDropdown';
import { getMonthYearDisplay } from '../utils/dateFormat';
import { getStatusColor } from './CasesList/utils';
import './BookingCalendar.css';

interface BookingCalendarProps {
  onCaseClick?: (caseId: string) => void;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({ onCaseClick }) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [cases, setCases] = useState<CaseBooking[]>([]);
  const [showMoreCasesPopup, setShowMoreCasesPopup] = useState(false);
  const [moreCasesData, setMoreCasesData] = useState<{date: string, cases: CaseBooking[]}>({date: '', cases: []});
  const [moreCasesCurrentPage, setMoreCasesCurrentPage] = useState(1);
  const moreCasesPerPage = 10;
  const [currentUser, setCurrentUser] = useState(getCurrentUser());
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [showDatePickers, setShowDatePickers] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Determine the active country (Admin selected country or user's country)
  const userCountry = currentUser?.selectedCountry || currentUser?.countries?.[0];
  const isAdmin = currentUser?.role === 'admin';
  const activeCountry = isAdmin && selectedCountry ? selectedCountry : userCountry;

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    
    // Load countries from Global-Table instead of hardcoded COUNTRIES
    const globalCountries = getCountries();
    const countries = globalCountries.length > 0 ? globalCountries : [...COUNTRIES];
    setAvailableCountries(countries);
    
    // Initialize selected country for Admin users
    if (user?.role === 'admin' && !selectedCountry) {
      const defaultCountry = user?.selectedCountry || user?.countries?.[0] || countries[0];
      setSelectedCountry(defaultCountry);
    }
    
    // Get departments for the active country from Code Table Setup
    const country = isAdmin && selectedCountry ? selectedCountry : (user?.selectedCountry || user?.countries?.[0]);
    if (country) {
      // Load country-specific departments from Code Table Setup
      const countryDepartments = getCodeTables(country);
      const departmentsTable = countryDepartments.find(table => table.id === 'departments');
      const countrySpecificDepts = departmentsTable?.items || [];
      
      // Filter by user's assigned departments if not admin
      let availableDepartments = countrySpecificDepts;
      if (user?.role !== 'admin' && user?.role !== 'it') {
        const userDepartments = user?.departments || [];
        
        // Handle both legacy and new country-specific department formats
        const userDepartmentNames = getDepartmentNamesForUser(userDepartments, [country]);
        availableDepartments = countrySpecificDepts.filter(dept => userDepartmentNames.includes(dept));
      }
      
      setDepartments(availableDepartments.sort());
      if (availableDepartments.length > 0) {
        setSelectedDepartment(availableDepartments[0]);
      }
    } else {
      // Fallback to global departments
      const userDepartments = getDepartments(user?.departments);
      setDepartments(userDepartments.sort());
      if (userDepartments.length > 0) {
        setSelectedDepartment(userDepartments[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry]); // isAdmin is derived from currentUser which is already handled

  // Load and filter cases whenever active country changes
  useEffect(() => {
    const loadCases = async () => {
      try {
        const allCases = await getCases();
        
        // Ensure allCases is an array
        if (!Array.isArray(allCases)) {
          console.error('getCases returned non-array in BookingCalendar:', allCases);
          setCases([]);
          return;
        }
        
        const filteredCases = allCases.filter(caseItem => {
          // Convert country name to country code for comparison
          const getCountryCode = (country: string) => {
            const countryMap: { [key: string]: string } = {
              'Singapore': 'SG',
              'Malaysia': 'MY',
              'Philippines': 'PH',
              'Indonesia': 'ID',
              'Vietnam': 'VN',
              'Hong Kong': 'HK',
              'Thailand': 'TH'
            };
            return countryMap[country] || 'SG';
          };
          
          // Filter by active country (convert country name to code)
          if (activeCountry) {
            const activeCountryCode = getCountryCode(activeCountry);
            if (caseItem.country !== activeCountryCode) {
              return false;
            }
          }
          
          // Filter by user's assigned departments (excluding admin/IT/operations/operations-manager)
          if (currentUser?.role !== 'admin' && 
              currentUser?.role !== 'it' && 
              currentUser?.role !== 'operations' && 
              currentUser?.role !== 'operations-manager') {
            
            if (currentUser?.departments && currentUser.departments.length > 0) {
              // Clean department names - remove country prefixes like "Singapore:", "Malaysia:"
              const cleanDepartmentName = (department: string) => {
                return department.replace(/^[A-Za-z\s]+:/, '').trim();
              };
              
              const userDepartments = currentUser.departments.map(cleanDepartmentName);
              const caseDepartment = cleanDepartmentName(caseItem.department);
              
              if (!userDepartments.includes(caseDepartment)) {
                return false;
              }
            }
          }
          
          return true;
        });
        setCases(filteredCases);
      } catch (error) {
        console.error('Error loading cases in BookingCalendar:', error);
        setCases([]);
      }
    };
    
    loadCases();
  }, [activeCountry, currentUser]);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node) && showDatePickers) {
        setShowDatePickers(false);
      }
    };

    if (showDatePickers) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePickers]);

  // Calendar helper functions
  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getMonthName = (date: Date): string => {
    return getMonthYearDisplay(date);
  };

  // Pagination logic for more cases modal
  const getCurrentPageCases = () => {
    const indexOfLastCase = moreCasesCurrentPage * moreCasesPerPage;
    const indexOfFirstCase = indexOfLastCase - moreCasesPerPage;
    return moreCasesData.cases.slice(indexOfFirstCase, indexOfLastCase);
  };

  const totalMoreCasesPages = Math.ceil(moreCasesData.cases.length / moreCasesPerPage);

  const handleMoreCasesPageChange = (pageNumber: number) => {
    setMoreCasesCurrentPage(pageNumber);
  };

  const navigateMonth = (direction: 'prev' | 'next'): void => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Generate month options
  const getMonthOptions = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months.map((month, index) => ({
      value: index.toString(),
      label: month
    }));
  };

  // Generate year options (current year ± 5 years)
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      years.push({
        value: i.toString(),
        label: i.toString()
      });
    }
    return years;
  };

  const handleMonthChange = (monthValue: string) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(parseInt(monthValue));
      return newDate;
    });
  };

  const handleYearChange = (yearValue: string) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setFullYear(parseInt(yearValue));
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get cases for a specific day
  const getCasesForDay = (day: number): CaseBooking[] => {
    if (!selectedDepartment) return [];
    
    // Create date string without timezone issues
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    
    return cases.filter(caseItem => 
      caseItem.dateOfSurgery === dateStr && 
      caseItem.department === selectedDepartment &&
      caseItem.status !== 'Case Cancelled'  // Exclude cancelled cases
    );
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
    
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Day headers
    const dayHeaders = dayNames.map(day => (
      <div key={day} className="calendar-day-header">
        {day}
      </div>
    ));
    
    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day calendar-day-empty"></div>);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && day === today.getDate();
      const dayClass = `calendar-day ${isToday ? 'calendar-day-today' : ''}`;
      const dayCases = getCasesForDay(day);
      
      days.push(
        <div key={day} className={dayClass}>
          <div className="calendar-day-number">{day}</div>
          <div className="calendar-day-content">
            {(() => {
              // Sort cases by time, showing earliest first
              const sortedCases = dayCases.sort((a, b) => {
                const timeA = a.timeOfProcedure || '23:59';
                const timeB = b.timeOfProcedure || '23:59';
                return timeA.localeCompare(timeB);
              });
              
              const displayCases = sortedCases.slice(0, 2);
              const remainingCases = sortedCases.slice(2);
              
              return (
                <>
                  {displayCases.map((caseItem, index) => (
                    <div 
                      key={`${caseItem.id}-${index}`} 
                      className="booking-item"
                      style={{
                        backgroundColor: getStatusColor(caseItem.status),
                        color: 'white'
                      }}
                      title={`${caseItem.caseReferenceNumber} - ${caseItem.procedureType} at ${caseItem.hospital} - Dr. ${caseItem.doctorName} - Status: ${caseItem.status}`}
                      onClick={() => onCaseClick?.(caseItem.id)}
                    >
                      <div className="booking-time" style={{color: 'white', fontWeight: 'bold'}}>{caseItem.timeOfProcedure || 'TBD'}</div>
                      <div className="booking-hospital" style={{fontSize: '9px', fontWeight: 'bold', color: 'white'}}>
                        {caseItem.hospital}
                      </div>
                      <div className="booking-procedure" style={{fontSize: '10px', fontWeight: '500', color: 'white'}}>
                        {caseItem.procedureType}
                      </div>
                      <div className="booking-doctor" style={{fontSize: '9px', color: 'white', opacity: 0.9}}>
                        {caseItem.doctorName || 'TBD'}
                      </div>
                    </div>
                  ))}
                  {remainingCases.length > 0 && (
                    <div 
                      className="more-cases-button"
                      onClick={() => {
                        // Create date string without timezone issues
                        const year = currentDate.getFullYear();
                        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
                        const dayStr = day.toString().padStart(2, '0');
                        const dateStr = `${dayStr}/${month}/${year}`;
                        setMoreCasesData({
                          date: dateStr,
                          cases: remainingCases
                        });
                        setMoreCasesCurrentPage(1);
                        setShowMoreCasesPopup(true);
                      }}
                    >
                      +{remainingCases.length} More Case{remainingCases.length > 1 ? 's' : ''}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      );
    }
    
    return (
      <div className="calendar-grid">
        {dayHeaders}
        {days}
      </div>
    );
  };

  return (
    <div className="booking-calendar">
      <div className="booking-calendar-header">
        <div className="calendar-title-row">
          <h2>📅 Booking Calendar</h2>
          {isAdmin && (
            <div className="admin-country-selector">
              <label htmlFor="calendar-country-select">Country:</label>
              <select
                id="calendar-country-select"
                value={selectedCountry || ''}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="country-select"
              >
                {availableCountries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <p>View and manage case bookings by department 
          <span> • Country: <strong>{activeCountry}</strong></span>
          {currentUser?.role !== 'admin' && currentUser?.role !== 'it' && (
            <span> • Filtered by your assigned departments</span>
          )}
        </p>
      </div>

      <div className="calendar-controls">
        <div className="department-selector">
          <label htmlFor="department-select">Department:</label>
          <SearchableDropdown
            id="department-select"
            value={selectedDepartment}
            onChange={setSelectedDepartment}
            options={departments}
            placeholder="Search and select department"
            className="form-control"
          />
        </div>
        
        <div className="calendar-navigation">
          <div className="nav-arrows">
            <button 
              onClick={() => navigateMonth('prev')}
              className="nav-button"
              title="Previous Month"
            >
              ← Previous
            </button>
            <button 
              onClick={() => navigateMonth('next')}
              className="nav-button"
              title="Next Month"
            >
              Next →
            </button>
          </div>
          
          <div className="month-year-display">
            <h3 className="current-month" onClick={() => setShowDatePickers(!showDatePickers)}>
              {getMonthName(currentDate)}
              <span className="dropdown-indicator">{showDatePickers ? '▲' : '▼'}</span>
            </h3>
            
            {showDatePickers && (
              <div className="date-picker-controls" ref={datePickerRef}>
                <div className="month-year-selectors">
                  <div className="selector-group">
                    <label>Month:</label>
                    <SearchableDropdown
                      options={getMonthOptions()}
                      value={currentDate.getMonth().toString()}
                      onChange={handleMonthChange}
                      placeholder="Select Month"
                      className="month-selector"
                    />
                  </div>
                  <div className="selector-group">
                    <label>Year:</label>
                    <SearchableDropdown
                      options={getYearOptions()}
                      value={currentDate.getFullYear().toString()}
                      onChange={handleYearChange}
                      placeholder="Select Year"
                      className="year-selector"
                    />
                  </div>
                </div>
                <div className="quick-actions">
                  <button 
                    onClick={goToToday}
                    className="today-button"
                    title="Go to current month"
                  >
                    📅 Today
                  </button>
                  <button 
                    onClick={() => setShowDatePickers(false)}
                    className="close-picker-button"
                    title="Close date picker"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="calendar-content">
        {selectedDepartment ? (
          <div className="calendar-view">
            <div className="calendar-department-info">
              <strong>Department: {selectedDepartment}</strong>
            </div>
            {renderCalendarGrid()}
          </div>
        ) : (
          <div className="no-department-selected">
            <p>Please select a department to view the booking calendar.</p>
          </div>
        )}
      </div>

      {/* More Cases Popup */}
      {showMoreCasesPopup && (
        <div className="more-cases-modal-overlay" onClick={() => setShowMoreCasesPopup(false)}>
          <div className="more-cases-modal" onClick={(e) => e.stopPropagation()}>
            <div className="more-cases-header">
              <h3>Additional Cases for {moreCasesData.date}</h3>
              <button 
                className="close-button"
                onClick={() => setShowMoreCasesPopup(false)}
              >
                ✕
              </button>
            </div>
            <div className="more-cases-content">
              <div className="more-cases-grid">
                {getCurrentPageCases().map((caseItem, index) => (
                  <div 
                    key={`more-${caseItem.id}-${index}`} 
                    className="more-case-item"
                    style={{
                      backgroundColor: getStatusColor(caseItem.status),
                      color: 'white'
                    }}
                    onClick={() => {
                      onCaseClick?.(caseItem.id);
                      setShowMoreCasesPopup(false);
                    }}
                  >
                    <div className="more-case-time" style={{color: 'white', fontWeight: 'bold'}}>{caseItem.timeOfProcedure || 'TBD'}</div>
                    <div className="more-case-info">
                      <div className="more-case-hospital" style={{fontWeight: 'bold', color: 'white', fontSize: '12px'}}>
                        {caseItem.hospital}
                      </div>
                      <div className="more-case-procedure" style={{fontWeight: '500', fontSize: '13px', color: 'white'}}>
                        {caseItem.procedureType}
                      </div>
                      <div className="more-case-details">
                        <span style={{color: 'white'}}>Dr. {caseItem.doctorName || 'TBD'}</span>
                        <span className="case-ref" style={{color: 'white', opacity: 0.9}}>{caseItem.caseReferenceNumber}</span>
                      </div>
                      <div className="more-case-status" style={{color: 'white', fontWeight: 'bold'}}>{caseItem.status}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              {totalMoreCasesPages > 1 && (
                <div className="more-cases-pagination">
                  <div className="pagination-info">
                    Showing {((moreCasesCurrentPage - 1) * moreCasesPerPage) + 1} to {Math.min(moreCasesCurrentPage * moreCasesPerPage, moreCasesData.cases.length)} of {moreCasesData.cases.length} cases
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => handleMoreCasesPageChange(moreCasesCurrentPage - 1)}
                      disabled={moreCasesCurrentPage === 1}
                    >
                      Previous
                    </button>
                    {[...Array(totalMoreCasesPages)].map((_, index) => {
                      const pageNumber = index + 1;
                      if (pageNumber === 1 || pageNumber === totalMoreCasesPages || (pageNumber >= moreCasesCurrentPage - 1 && pageNumber <= moreCasesCurrentPage + 1)) {
                        return (
                          <button
                            key={pageNumber}
                            className={`btn btn-sm ${pageNumber === moreCasesCurrentPage ? 'btn-primary' : 'btn-outline-secondary'}`}
                            onClick={() => handleMoreCasesPageChange(pageNumber)}
                          >
                            {pageNumber}
                          </button>
                        );
                      } else if (pageNumber === moreCasesCurrentPage - 2 || pageNumber === moreCasesCurrentPage + 2) {
                        return <span key={pageNumber} className="pagination-ellipsis">...</span>;
                      }
                      return null;
                    })}
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => handleMoreCasesPageChange(moreCasesCurrentPage + 1)}
                      disabled={moreCasesCurrentPage === totalMoreCasesPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingCalendar;