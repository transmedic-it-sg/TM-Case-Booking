import React, { useState, useEffect, useRef } from 'react';
import { SUPPORTED_COUNTRIES } from '../utils/countryUtils';
import { getCurrentUserSync } from '../utils/authCompat';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { useRealtimeCases } from '../hooks/useRealtimeCases';
import { CaseBooking } from '../types';
import SearchableDropdown from './SearchableDropdown';
import { getMonthYearDisplay } from '../utils/dateFormat';
import { getStatusColor } from './CasesList/utils';
import { CASE_STATUSES } from '../constants/statuses';
import { getDailyUsageForDate, type DailyUsage } from '../utils/unifiedDataService';
import { normalizeCountry } from '../utils/countryUtils';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../utils/fieldMappings';
import '../assets/components/BookingCalendar.css';

// Helper function to format doctor names consistently
const formatDoctorName = (name?: string): string => {
  if (!name) return 'No doctor assigned';
  const trimmed = name.trim();
  // If name already starts with "Dr" or "Dr.", don't add another "Dr."
  if (trimmed.toLowerCase().startsWith('dr')) {
    return trimmed;
  }
  return `Dr. ${trimmed}`;
};

interface BookingCalendarProps {
  onCaseClick?: (caseId: string) => void;
  onDateClick?: (date: Date, department: string) => void;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({ onCaseClick, onDateClick }) => {
  const initialCurrentUser = getCurrentUserSync();
  
  // Determine the active country (Admin selected country or user's country)
  const userCountry = initialCurrentUser?.selectedCountry || initialCurrentUser?.countries?.[0];
  const isAdmin = initialCurrentUser?.role === 'admin';
  
  // Use dynamic country filter that updates with user selections
  const [filterCountry, setFilterCountry] = useState<string>(
    userCountry ? normalizeCountry(userCountry) : ''
  );
  
  // Component state variables
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

  // New state for usage view
  const [viewMode, setViewMode] = useState<'bookings' | 'usage'>('bookings');
  const [usageData, setUsageData] = useState<DailyUsage[]>([]);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [showUsagePopup, setShowUsagePopup] = useState(false);
  const [usagePopupData, setUsagePopupData] = useState<{date: string, usage: DailyUsage | null}>({date: '', usage: null});
  const [usageRefreshTimestamp, setUsageRefreshTimestamp] = useState<number>(Date.now());

  // Check if user has permission to view booking calendar
  const canViewCalendar = initialCurrentUser ? hasPermission(initialCurrentUser.role, PERMISSION_ACTIONS.BOOKING_CALENDAR) : false;

  // Determine the active country (Admin selected country or user's country)
  const activeCountry = isAdmin && selectedCountry ? selectedCountry : userCountry;

  const { cases = [] } = useRealtimeCases({
    enableRealTime: true,
    enableTesting: true,
    filters: {
      country: filterCountry
    }
  });

  // Debug: Log cases data for BookingCalendar
  React.useEffect(() => {
    if (cases.length > 0) {
    }
  }, [cases, filterCountry, activeCountry, userCountry, selectedCountry]);

  // Update filter country when active country changes
  useEffect(() => {
    if (activeCountry && activeCountry !== filterCountry) {
      // Normalize country name to match database format
      const normalizedCountry = normalizeCountry(activeCountry);
      setFilterCountry(normalizedCountry);
    }
  }, [activeCountry, filterCountry]);

  useEffect(() => {
    const user = getCurrentUserSync();
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
          const countrySpecificDepts = await getDepartmentsForCountry(country);// Filter by user's assigned departments if not admin
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
          // Error loading departments from Supabase code tables
          // No fallback - set empty departments
          setDepartments([]);
        }
      };

      loadDepartments();
    } else {
      // No current user - set empty departments
      setDepartments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry]); // isAdmin is derived from currentUser which is already handled

  // Cases are automatically loaded by useRealtimeCases hook - live data, no cache

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

  // Load usage data when view mode is 'usage'
  useEffect(() => {
    const loadUsageData = async () => {
      if (viewMode !== 'usage' || !activeCountry) {
        setUsageData([]);
        return;
      }

      setIsLoadingUsage(true);
      try {
        const normalizedCountry = normalizeCountry(activeCountry);

        // Get all dates in the current month
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();// Load usage data for each day in the month
        const allUsageData: DailyUsage[] = [];
        const loadPromises: Promise<void>[] = [];

        for (let day = 1; day <= daysInMonth; day++) {
          const currentDateStr = new Date(year, month, day).toISOString().split('T')[0];

          const loadPromise = getDailyUsageForDate(currentDateStr, normalizedCountry)
            .then(dailyUsage => {
              if (dailyUsage && dailyUsage.length > 0) {
                allUsageData.push(...dailyUsage);
              }
            })
            .catch(error => {
              // Error loading usage data - will show empty usage
            });

          loadPromises.push(loadPromise);
        }

        // Wait for all data to load
        await Promise.all(loadPromises);setUsageData(allUsageData);

      } catch (error) {
        // Error loading usage data - set empty usage
        setUsageData([]);
      } finally {
        setIsLoadingUsage(false);
      }
    };

    loadUsageData();
  }, [viewMode, activeCountry, currentDate, usageRefreshTimestamp, cases]);

  // Auto-refresh usage data every 30 seconds when in usage mode to detect amendment changes
  useEffect(() => {
    if (viewMode !== 'usage') return;

    const interval = setInterval(() => {
      setUsageRefreshTimestamp(Date.now());
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [viewMode]);

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
                    <div className="mobile-case-doctor">
                      {formatDoctorName(caseItem.doctorName)}
                    </div>
                  </div>
                </div>
              ))}

              {/* Add click-to-book button for all days when onDateClick is available */}
              {onDateClick && (
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
                      <div className="mobile-book-new-subtitle">
                        {dayCases.length === 0 ? 'Tap to create a booking' : 'Tap to add another booking'}
                      </div>
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

  // Mobile usage view for better mobile experience
  const renderMobileUsageView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const days = [];
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
        .toISOString().split('T')[0];
      
      const dayUsage = usageData.find(usage => usage.usage_date === dateString);
      const isToday = isCurrentMonth && day === today.getDate();
      const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateString2 = dayDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });

      // Only show days with usage data
      if (dayUsage && (dayUsage.surgery_sets_total > 0 || dayUsage.implant_boxes_total > 0)) {
        days.push(
          <div key={day} className={`mobile-calendar-day ${isToday ? 'mobile-calendar-day-today' : ''}`}>
            <div className="mobile-calendar-day-header">
              <h3 className="mobile-calendar-date">
                {isToday && <span className="today-badge">Today</span>}
                {dateString2}
              </h3>
              <div className="mobile-calendar-day-count">
                Usage Summary
              </div>
            </div>
            <div className="mobile-calendar-usage">
              <div className="mobile-usage-summary">
                <div className="mobile-usage-totals">
                  {dayUsage.surgery_sets_total > 0 && (
                    <div className="mobile-usage-item surgery-sets">
                      <span className="mobile-usage-icon">🏥</span>
                      <span className="mobile-usage-label">Surgery Sets</span>
                      <span className="mobile-usage-count">{dayUsage.surgery_sets_total}</span>
                    </div>
                  )}
                  {dayUsage.implant_boxes_total > 0 && (
                    <div className="mobile-usage-item implant-boxes">
                      <span className="mobile-usage-icon">📦</span>
                      <span className="mobile-usage-label">Implant Boxes</span>
                      <span className="mobile-usage-count">{dayUsage.implant_boxes_total}</span>
                    </div>
                  )}
                </div>
                {dayUsage.top_items && dayUsage.top_items.length > 0 && (
                  <div className="mobile-usage-actions">
                    <button
                      className="mobile-view-sets-button"
                      onClick={() => {
                        setUsagePopupData({
                          date: dayDate.toLocaleDateString(),
                          usage: dayUsage
                        });
                        setShowUsagePopup(true);
                      }}
                    >
                      <div className="mobile-view-sets-content">
                        <div className="mobile-view-sets-icon">📋</div>
                        <div className="mobile-view-sets-text">
                          <div className="mobile-view-sets-title">View Detailed Usage</div>
                          <div className="mobile-view-sets-subtitle">
                            {dayUsage.top_items.length} item{dayUsage.top_items.length !== 1 ? 's' : ''} used
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }
    }

    if (days.length === 0) {
      return (
        <div className="mobile-calendar-empty">
          <div className="empty-state">
            <h3>No usage data</h3>
            <p>No usage data found for {getMonthYearDisplay(currentDate)} in {selectedDepartment}</p>
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
          title={dayCases.length === 0 ? `Click to book a new case for ${day}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}` : `${dayCases.length} case(s) scheduled`}
          data-tooltip={dayCases.length === 0 ? 'Click to book' : `${dayCases.length} cases`}
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
                      title={`${caseItem.caseReferenceNumber} - ${caseItem.procedureType} at ${caseItem.hospital} - ${formatDoctorName(caseItem.doctorName) || 'No doctor'} - Status: ${caseItem.status}`}
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

  // Render usage calendar with quantity aggregation
  const renderUsageCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const dayHeaders = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      dayHeaders.push(
        <div key={`header-${i}`} className="calendar-day-header">
          {dayNames[i]}
        </div>
      );
    }

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
        .toISOString().split('T')[0];

      // Find usage data for this day
      const dayUsage = usageData.find(usage => usage.usage_date === dateString);

      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
      const dayClass = `calendar-day usage-day ${isToday ? 'calendar-day-today' : ''}`;

      days.push(
        <div key={day} className={dayClass}>
          <div className="calendar-day-number">{day}</div>
          <div className="usage-day-content">
            {dayUsage ? (
              <div className="usage-summary">
                <div className="usage-totals">
                  {dayUsage.surgery_sets_total > 0 && (
                    <div className="usage-item surgery-sets" title="Surgery Sets">
                      <span className="usage-icon">🏥</span>
                      <span className="usage-count">{dayUsage.surgery_sets_total}</span>
                    </div>
                  )}
                  {dayUsage.implant_boxes_total > 0 && (
                    <div className="usage-item implant-boxes" title="Implant Boxes">
                      <span className="usage-icon">📦</span>
                      <span className="usage-count">{dayUsage.implant_boxes_total}</span>
                    </div>
                  )}
                </div>
                {dayUsage.top_items && dayUsage.top_items.length > 0 && (
                  <div className="usage-actions">
                    <button
                      className="view-sets-button"
                      onClick={() => {
                        setUsagePopupData({
                          date: new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString(),
                          usage: dayUsage
                        });
                        setShowUsagePopup(true);
                      }}
                      title="View detailed usage breakdown"
                    >
                      📋 View Sets ({dayUsage.top_items.length})
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Hide days with no usage to reduce empty space
              <div className="no-usage" style={{ display: 'none' }}>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="calendar-grid usage-calendar-grid">
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

        {/* View Mode Toggle */}
        <div className="view-mode-toggle">
          <label>View:</label>
          <div className="toggle-buttons">
            <button
              className={`toggle-button ${viewMode === 'bookings' ? 'active' : ''}`}
              onClick={() => setViewMode('bookings')}
              title="Show case bookings"
            >
              📅 Bookings
            </button>
            <button
              className={`toggle-button ${viewMode === 'usage' ? 'active' : ''}`}
              onClick={() => setViewMode('usage')}
              title="Show quantity usage aggregation"
            >
              📊 Usage
            </button>
          </div>
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
              {viewMode === 'usage' && (
                <span className="usage-info">
                  • Showing quantity aggregation for cases in "Preparing Order" status
                </span>
              )}
            </div>
            <div className="desktop-calendar-view">
              {viewMode === 'bookings' ? renderCalendarGrid() :
               viewMode === 'usage' && isLoadingUsage ? (
                 <div className="usage-loading">
                   <div className="loading-spinner">⏳</div>
                   <p>Loading usage data...</p>
                 </div>
               ) : (
                 renderUsageCalendar()
               )}
            </div>
            <div className="mobile-calendar-view">
              {viewMode === 'bookings' ? (
                renderMobileListView()
              ) : viewMode === 'usage' && isLoadingUsage ? (
                <div className="mobile-usage-loading">
                  <div className="loading-spinner">⏳</div>
                  <p>Loading usage data...</p>
                </div>
              ) : (
                renderMobileUsageView()
              )}
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
                        <span style={{color: 'white'}}>
                          {formatDoctorName(caseItem.doctorName) || 'TBD'}
                        </span>
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

      {/* Usage Details Popup */}
      {showUsagePopup && usagePopupData.usage && (
        <div className="usage-popup-overlay" onClick={() => setShowUsagePopup(false)}>
          <div className="usage-popup" onClick={(e) => e.stopPropagation()}>
            <div className="usage-popup-header">
              <h3>Usage Details - {usagePopupData.date}</h3>
              <button 
                className="close-button"
                onClick={() => setShowUsagePopup(false)}
              >
                ✕
              </button>
            </div>
            <div className="usage-popup-content">
              <div className="usage-summary-section">
                <h4>Totals</h4>
                <div className="usage-totals-grid">
                  <div className="total-item">
                    <span className="total-icon">🏥</span>
                    <span className="total-label">Surgery Sets:</span>
                    <span className="total-value">{usagePopupData.usage.surgery_sets_total}</span>
                  </div>
                  <div className="total-item">
                    <span className="total-icon">📦</span>
                    <span className="total-label">Implant Boxes:</span>
                    <span className="total-value">{usagePopupData.usage.implant_boxes_total}</span>
                  </div>
                </div>
              </div>
              
              {usagePopupData.usage.top_items && usagePopupData.usage.top_items.length > 0 && (
                <div className="items-breakdown-section">
                  <h4>Items Breakdown</h4>
                  <div className="items-list">
                    {usagePopupData.usage.top_items.map((item, index) => (
                      <div key={index} className="usage-item-row">
                        <span className="item-name">{item.item_name}</span>
                        <span className="item-quantity">×{item.quantity}</span>
                      </div>
                    ))}
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