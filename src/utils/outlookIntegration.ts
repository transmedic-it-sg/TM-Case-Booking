import { CaseBooking, User } from '../types';
import { formatDateTime } from './dateFormat';

/**
 * Generates an Outlook calendar invite URL for a case preparation
 * @param caseItem - The case booking details
 * @param submitterEmail - Email of the case submitter
 * @param preparedBy - User who prepared the order
 */
export const generateOutlookCalendarInvite = (
  caseItem: CaseBooking, 
  submitterEmail: string, 
  preparedBy: User
): string => {
  // Format the surgery date for the calendar
  const surgeryDate = new Date(caseItem.dateOfSurgery);
  
  // Set the event time based on timeOfProcedure or default to 9:00 AM
  let eventDateTime = new Date(surgeryDate);
  if (caseItem.timeOfProcedure) {
    const [hours, minutes] = caseItem.timeOfProcedure.split(':').map(Number);
    eventDateTime.setHours(hours, minutes, 0, 0);
  } else {
    eventDateTime.setHours(9, 0, 0, 0); // Default to 9:00 AM
  }
  
  // Set end time to 1 hour after start time
  const endDateTime = new Date(eventDateTime);
  endDateTime.setHours(endDateTime.getHours() + 1);
  
  // Format dates for Outlook (ISO format without colons in time)
  const startTime = eventDateTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const endTime = endDateTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  
  // Create the calendar event details
  const subject = `Medical Case Procedure - ${caseItem.procedureType} (${caseItem.caseReferenceNumber})`;
  
  const body = `
Case Details:
- Reference Number: ${caseItem.caseReferenceNumber}
- Hospital: ${caseItem.hospital}
- Department: ${caseItem.department}
- Procedure Type: ${caseItem.procedureType}
- Procedure Name: ${caseItem.procedureName}
${caseItem.doctorName ? `- Doctor: ${caseItem.doctorName}` : ''}
${caseItem.specialInstruction ? `- Special Instructions: ${caseItem.specialInstruction}` : ''}

Order Status: Case Prepared
Prepared by: ${preparedBy.name}
Prepared at: ${formatDateTime(new Date())}

Surgery Set Selection:
${caseItem.surgerySetSelection.map(set => `• ${set}`).join('\n')}

Implant Box:
${caseItem.implantBox.map(box => `• ${box}`).join('\n')}
  `.trim();
  
  const location = `${caseItem.hospital} - ${caseItem.department}`;
  
  // Build the Outlook calendar URL
  const outlookUrl = new URL('https://outlook.live.com/calendar/0/deeplink/compose');
  outlookUrl.searchParams.set('subject', subject);
  outlookUrl.searchParams.set('body', body);
  outlookUrl.searchParams.set('location', location);
  outlookUrl.searchParams.set('startdt', startTime);
  outlookUrl.searchParams.set('enddt', endTime);
  outlookUrl.searchParams.set('to', submitterEmail);
  
  return outlookUrl.toString();
};

/**
 * Opens an Outlook calendar invite in a new window/tab
 * @param caseItem - The case booking details
 * @param submitterEmail - Email of the case submitter
 * @param preparedBy - User who prepared the order
 */
export const openOutlookCalendarInvite = (
  caseItem: CaseBooking, 
  submitterEmail: string, 
  preparedBy: User
): void => {
  if (!submitterEmail) {
    console.warn('Cannot create Outlook invite: Submitter email not available');
    return;
  }
  
  const calendarUrl = generateOutlookCalendarInvite(caseItem, submitterEmail, preparedBy);
  
  // Open in new window/tab
  window.open(calendarUrl, '_blank', 'noopener,noreferrer');
};

/**
 * Creates a downloadable .ics file for the calendar event
 * @param caseItem - The case booking details
 * @param submitterEmail - Email of the case submitter
 * @param preparedBy - User who prepared the order
 */
export const generateICSFile = (
  caseItem: CaseBooking, 
  submitterEmail: string, 
  preparedBy: User
): void => {
  const surgeryDate = new Date(caseItem.dateOfSurgery);
  
  // Set the event time based on timeOfProcedure or default to 9:00 AM
  let eventDateTime = new Date(surgeryDate);
  if (caseItem.timeOfProcedure) {
    const [hours, minutes] = caseItem.timeOfProcedure.split(':').map(Number);
    eventDateTime.setHours(hours, minutes, 0, 0);
  } else {
    eventDateTime.setHours(9, 0, 0, 0);
  }
  
  const endDateTime = new Date(eventDateTime);
  endDateTime.setHours(endDateTime.getHours() + 1);
  
  // Format dates for ICS format
  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };
  
  const startTime = formatICSDate(eventDateTime);
  const endTime = formatICSDate(endDateTime);
  const createdTime = formatICSDate(new Date());
  
  const subject = `Medical Case Procedure - ${caseItem.procedureType} (${caseItem.caseReferenceNumber})`;
  const location = `${caseItem.hospital} - ${caseItem.department}`;
  
  const description = `Case Details:\\n` +
    `Reference Number: ${caseItem.caseReferenceNumber}\\n` +
    `Hospital: ${caseItem.hospital}\\n` +
    `Department: ${caseItem.department}\\n` +
    `Procedure Type: ${caseItem.procedureType}\\n` +
    `Procedure Name: ${caseItem.procedureName}\\n` +
    (caseItem.doctorName ? `Doctor: ${caseItem.doctorName}\\n` : '') +
    (caseItem.specialInstruction ? `Special Instructions: ${caseItem.specialInstruction}\\n` : '') +
    `\\nOrder Status: Case Prepared\\n` +
    `Prepared by: ${preparedBy.name}\\n` +
    `Prepared at: ${formatDateTime(new Date())}\\n` +
    `\\nSurgery Set Selection:\\n` +
    caseItem.surgerySetSelection.map(set => `• ${set}`).join('\\n') +
    `\\n\\nImplant Box:\\n` +
    caseItem.implantBox.map(box => `• ${box}`).join('\\n');
  
  // Create ICS content
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Case Booking App//Medical Case Calendar//EN',
    'BEGIN:VEVENT',
    `UID:${caseItem.id}-${createdTime}@casebooking.app`,
    `DTSTAMP:${createdTime}`,
    `DTSTART:${startTime}`,
    `DTEND:${endTime}`,
    `SUMMARY:${subject}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `ATTENDEE;CN=${preparedBy.name}:MAILTO:${preparedBy.email || 'noreply@casebooking.app'}`,
    `ATTENDEE;CN=Case Submitter:MAILTO:${submitterEmail}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  
  // Create and download the file
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `case-${caseItem.caseReferenceNumber}-calendar-invite.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};