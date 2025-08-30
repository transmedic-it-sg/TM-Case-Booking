import React, { useState, useEffect, useRef } from 'react';
import { SUPPORTED_COUNTRIES } from '../utils/countryUtils';
import { getCurrentUser } from '../utils/auth';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { useCases } from '../hooks/useCases';
import { CaseBooking } from '../types';
import SearchableDropdown from './SearchableDropdown';
import { getMonthYearDisplay } from '../utils/dateFormat';
import { getStatusColor } from './CasesList/utils';
import { CASE_STATUSES } from '../constants/statuses';
import '../assets/components/BookingCalendar.css';

interface BookingCalendarProps {
  onCaseClick?: (caseId: string) => void;
  onDateClick?: (date: Date, department: string) => void;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({ onCaseClick, onDateClick }) => {
  const initialCurrentUser = getCurrentUser();
  const { cases } = useCases();
  
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [showMoreCasesPopup, setShowMoreCasesPopup] = useState(false);
  const [moreCasesData, setMoreCasesData] = useState<{date: string, cases: CaseBooking[]}>({date: '', cases: []});
  const [moreCasesCurrentPage, setMoreCasesCurrentPage] = useState(1);
  const moreCasesPerPage = 10;
  const [currentUser, setCurrentUser] = useState(initialCurrentUser);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [showDatePickers, setShowDatePickers] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Check if user has permission to view booking calendar
  const canViewCalendar = initialCurrentUser ? hasPermission(initialCurrentUser.role, PERMISSION_ACTIONS.BOOKING_CALENDAR) : false;

  // Determine the active country (Admin selected country or user's country)
  const userCountry = currentUser?.selectedCountry || currentUser?.countries?.[0];
  const isAdmin = currentUser?.role === 'admin';
  const activeCountry = isAdmin && selectedCountry ? selectedCountry : userCountry;

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    
    // Load countries from centralized country utils
    setAvailableCountries([...SUPPORTED_COUNTRIES]);
    
    // Initialize selected country for Admin users
    if (user?.role === 'admin' && !selectedCountry) {
      const defaultCountry = user?.selectedCountry || user?.countries?.[0] || SUPPORTED_COUNTRIES[0];
      setSelectedCountry(defaultCountry);
    }
    
    // Get departments for the active country using the same service as New Case Booking
    const country = isAdmin && selectedCountry ? selectedCountry : (user?.selectedCountry || user?.countries?.[0]);
    if (country) {
      // Use the same service as CaseBookingForm for consistency
      const loadDepartments = async () => {
        try {
          // Use the CORRECT code table service instead of the wrong departments table
          const { getDepartmentsForCountry } = await import('../utils/supabaseCodeTableService');
          const countrySpecificDepts = await getDepartmentsForCountry(country);
          
          console.log(`🔍 BookingCalendar: Found ${countrySpecificDepts.length} departments for ${country}:`, countrySpecificDepts);
          
          // Filter by user's assigned departments if not admin
          let availableDepartments = countrySpecificDepts;
          if (user?.role !== 'admin' && user?.role !== 'it') {
            const userDepartments = user?.departments || [];
            availableDepartments = countrySpecificDepts.filter(dept => userDepartments.includes(dept));
          }
          
          setDepartments(availableDepartments.sort());
          if (availableDepartments.length > 0) {
            setSelectedDepartment(availableDepartments[0]);
          }
        } catch (error) {
          console.error('Error loading departments from Supabase code tables:', error);
          // Use fallback departments
          setDepartments(['Cardiology', 'Orthopedics', 'Neurosurgery', 'Oncology'].sort());
          setSelectedDepartment('Cardiology');
        }
      };
      
      loadDepartments();
    } else {
      // Use default departments as fallback
      const defaultDepartments = ['Cardiology', 'Orthopedics', 'Neurosurgery', 'Oncology', 'Emergency', 'Radiology', 'Anesthesiology', 'Gastroenterology'];
      setDepartments(defaultDepartments.sort());
      if (defaultDepartments.length > 0) {
        setSelectedDepartment(defaultDepartments[0]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry]); // isAdmin is derived from currentUser which is already handled

  // Cases are automatically loaded by useCases hook - no need to manually load

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
    // Create date string without timezone issues
    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${dayStr}`;
    
    return cases.filter(caseItem => {
      const matchesDate = caseItem.dateOfSurgery === dateStr;
      const isNotCancelled = caseItem.status !== 'Case Cancelled';
      
      // Driver role filtering - only show delivery-related statuses
      if (currentUser?.role === 'driver') {
        const isDeliveryRelated = [
          CASE_STATUSES.PENDING_DELIVERY_HOSPITAL,
          CASE_STATUSES.DELIVERED_HOSPITAL,
          CASE_STATUSES.PENDING_DELIVERY_OFFICE,
          CASE_STATUSES.DELIVERED_OFFICE
        ].includes(caseItem.status);
        
        if (!isDeliveryRelated) {
          return false;
        }
      }
      
      // If no department is selected, show all (filtered) non-cancelled cases for that date
      if (!selectedDepartment) {
        return matchesDate && isNotCancelled;
      }
      
      // If department is selected, filter by department as well
      return matchesDate && caseItem.department === selectedDepartment && isNotCancelled;
    });
  };

  // Mobile list view for better mobile experience
  const renderMobileListView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const days = [];
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCases = getCasesForDay(day);
      const isToday = isCurrentMonth && day === today.getDate();
      const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateString = dayDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      });
      
      // Show days with cases OR allow click-to-book on empty days
      if (dayCases.length > 0 || onDateClick) {
        days.push(
          <div key={day} className={`mobile-calendar-day ${isToday ? 'mobile-calendar-day-today' : ''}`}>
            <div className="mobile-calendar-day-header">
              <h3 className="mobile-calendar-date">
                {isToday && <span className="today-badge">Today</span>}
                {dateString}
              </h3>
              <div className="mobile-calendar-day-count">
                {dayCases.length} case{dayCases.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="mobile-calendar-cases">
              {dayCases.map((caseItem, index) => (
                <div 
                  key={`${caseItem.id}-${index}`} 
                  className="mobile-calendar-case"
                  onClick={() => onCaseClick?.(caseItem.id)}
                >
                  <div className="mobile-case-header">
                    <div className="mobile-case-time">
                      {caseItem.timeOfProcedure || 'TBD'}
                    </div>
                    <div 
                      className="mobile-case-status"
                      style={{
                        backgroundColor: getStatusColor(caseItem.status),
                        color: 'white'
                      }}
                    >
                      {caseItem.status}
                    </div>
                  </div>
                  <div className="mobile-case-details">
                    <div className="mobile-case-ref">{caseItem.caseReferenceNumber}</div>
                    <div className="mobile-case-procedure">{caseItem.procedureType}</div>
                    <div className="mobile-case-hospital">{caseItem.hospital}</div>
                    <div className="mobile-case-doctor">Dr. {caseItem.doctorName}</div>
                  </div>
                </div>
              ))}
              
              {/* Add click-to-book button for empty days */}
              {dayCases.length === 0 && onDateClick && (
                <div 
                  className="mobile-calendar-book-new"
                  onClick={() => {
                    // Create date at noon to avoid timezone issues when converting to/from ISO string
                    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 12, 0, 0, 0);
                    onDateClick(clickedDate, selectedDepartment);
                  }}
                >
                  <div className="mobile-book-new-content">
                    <div className="mobile-book-new-icon">📅</div>
                    <div className="mobile-book-new-text">
                      <div className="mobile-book-new-title">Book New Case</div>
                      <div className="mobile-book-new-subtitle">Tap to create a booking</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }
    }
    
    if (days.length === 0) {
      return (
        <div className="mobile-calendar-empty">
          <div className="empty-state">
            <h3>No cases scheduled</h3>
            <p>No cases found for {getMonthYearDisplay(currentDate)} in {selectedDepartment}</p>
          </div>
        </div>
      );
    }
    
    return <div className="mobile-calendar-list">{days}</div>;
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
      
      const handleDayClick = (event: React.MouseEvent, clickedDay: number) => {
        // Only trigger date click if clicking on empty space (not on existing cases)
        if ((event.target as HTMLElement).closest('.booking-item, .more-cases-button')) {
          return; // Click was on a case or more cases button, don't trigger date click
        }
        
        if (onDateClick && selectedDepartment) {
          // Create date at noon to avoid timezone issues when converting to/from ISO string
          const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), clickedDay, 12, 0, 0, 0);
          onDateClick(clickedDate, selectedDepartment);
        }
      };

      days.push(
        <div 
          key={day} 
          className={`${dayClass} ${dayCases.length === 0 ? 'calendar-day-clickable' : ''}`}
          onClick={(e) => handleDayClick(e, day)}
          title={dayCases.length === 0 ? `Click to book a new case for ${day}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}` : ''}
        >
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

  if (!canViewCalendar) {
    return (
      <div className="permission-denied">
        <div className="permission-denied-content">
          <h2>🚫 Access Denied</h2>
          <p>You don't have permission to view the booking calendar.</p>
          <p>Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-calendar">
      <div className="booking-calendar-header">
        <div className="calendar-title-row">
          <h2>📅 Booking Calendar</h2>
          {isAdmin && (
            <div className="admin-country-selector">
              <label htmlFor="calendar-country-select">Country:</label>
              <SearchableDropdown
                id="calendar-country-select"
                value={selectedCountry || ''}
                onChange={setSelectedCountry}
                options={availableCountries}
                placeholder="Search and select country"
                className="country-select"
              />
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
            <div className="desktop-calendar-view">
              {renderCalendarGrid()}
            </div>
            <div className="mobile-calendar-view">
              {renderMobileListView()}
            </div>
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