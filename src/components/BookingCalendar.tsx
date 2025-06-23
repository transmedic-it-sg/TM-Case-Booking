import React, { useState, useEffect } from 'react';
import { getDepartments } from '../utils/codeTable';
import { getCurrentUser } from '../utils/auth';
import { getCases } from '../utils/storage';
import { CaseBooking } from '../types';
import SearchableDropdown from './SearchableDropdown';
import './BookingCalendar.css';

interface BookingCalendarProps {}

const BookingCalendar: React.FC<BookingCalendarProps> = () => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [cases, setCases] = useState<CaseBooking[]>([]);
  const [currentUser, setCurrentUser] = useState(getCurrentUser());

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    
    // Get departments filtered by user's assigned departments
    const userDepartments = getDepartments(user?.departments);
    setDepartments(userDepartments.sort()); // Sort alphabetically
    if (userDepartments.length > 0) {
      setSelectedDepartment(userDepartments[0]);
    }
    
    // Load and filter cases by user's country and departments
    const allCases = getCases();
    const filteredCases = allCases.filter(caseItem => {
      // Filter by user's country
      const userCountry = user?.selectedCountry || user?.countries?.[0];
      if (userCountry && caseItem.country !== userCountry) {
        return false;
      }
      
      // Filter by user's assigned departments (unless admin/IT)
      if (user?.role !== 'admin' && user?.role !== 'it') {
        if (user?.departments && !user.departments.includes(caseItem.department)) {
          return false;
        }
      }
      
      return true;
    });
    setCases(filteredCases);
  }, []);

  // Calendar helper functions
  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getMonthName = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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

  // Get cases for a specific day
  const getCasesForDay = (day: number): CaseBooking[] => {
    if (!selectedDepartment) return [];
    
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString().split('T')[0];
    
    return cases.filter(caseItem => 
      caseItem.dateOfSurgery === dateStr && 
      caseItem.department === selectedDepartment
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
            {dayCases.map((caseItem, index) => (
              <div 
                key={`${caseItem.id}-${index}`} 
                className="booking-item"
                title={`${caseItem.caseReferenceNumber} - ${caseItem.procedureName} - ${caseItem.doctorName} - Status: ${caseItem.status}`}
              >
                <div className="booking-time">{caseItem.timeOfProcedure || 'TBD'}</div>
                <div className="booking-title">{caseItem.procedureName}</div>
                <div className="booking-doctor" style={{fontSize: '9px', opacity: 0.8}}>
                  Dr. {caseItem.doctorName}
                </div>
              </div>
            ))}
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
        <h2>📅 Booking Calendar</h2>
        <p>View and manage case bookings by department 
          {currentUser?.selectedCountry && (
            <span> • Country: <strong>{currentUser.selectedCountry}</strong></span>
          )}
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
          <button 
            onClick={() => navigateMonth('prev')}
            className="nav-button"
          >
            ← Previous
          </button>
          <h3 className="current-month">{getMonthName(currentDate)}</h3>
          <button 
            onClick={() => navigateMonth('next')}
            className="nav-button"
          >
            Next →
          </button>
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
    </div>
  );
};

export default BookingCalendar;