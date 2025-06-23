import React, { useState, useEffect } from 'react';
import { getDepartments } from '../utils/codeTable';
import { getCurrentUser } from '../utils/auth';
import './BookingCalendar.css';

interface BookingCalendarProps {}

const BookingCalendar: React.FC<BookingCalendarProps> = () => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  useEffect(() => {
    const currentUser = getCurrentUser();
    // Get departments filtered by user's assigned departments
    const userDepartments = getDepartments(currentUser?.departments);
    setDepartments(userDepartments);
    if (userDepartments.length > 0) {
      setSelectedDepartment(userDepartments[0]);
    }
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
      
      days.push(
        <div key={day} className={dayClass}>
          <div className="calendar-day-number">{day}</div>
          <div className="calendar-day-content">
            {/* Mock booking data - you can replace this with actual booking data */}
            {day % 7 === 0 && (
              <div className="booking-item">
                <div className="booking-time">09:00</div>
                <div className="booking-title">Surgery A</div>
              </div>
            )}
            {day % 5 === 0 && day !== 0 && (
              <div className="booking-item">
                <div className="booking-time">14:30</div>
                <div className="booking-title">Surgery B</div>
              </div>
            )}
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
        <p>View and manage case bookings by department</p>
      </div>

      <div className="calendar-controls">
        <div className="department-selector">
          <label htmlFor="department-select">Department:</label>
          <select
            id="department-select"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="form-control"
          >
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
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