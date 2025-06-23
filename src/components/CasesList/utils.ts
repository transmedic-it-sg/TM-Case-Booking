import { CaseStatus } from '../../types';

export const statusOptions: CaseStatus[] = [
  'Case Booked',
  'Order Preparation',
  'Order Prepared',
  'Pending Delivery (Hospital)',
  'Delivered (Hospital)',
  'Case Completed',
  'Delivered (Office)',
  'To be billed',
  'Case Cancelled'
];

export const getNextResponsibleRole = (status: CaseStatus): string | null => {
  switch (status) {
    case 'Case Booked':
      return 'Operations / Operations Manager';
    case 'Order Preparation':
      return 'Operations Team';
    case 'Order Prepared':
      return 'Driver';
    case 'Pending Delivery (Hospital)':
      return 'Driver';
    case 'Delivered (Hospital)':
      return 'Sales Team';
    case 'Case Completed':
      return 'Driver / Sales';
    case 'Delivered (Office)':
      return 'Admin / System';
    default:
      return null;
  }
};

export const getTooltipMessage = (requiredRoles: string[], action: string): string => {
  const roleNames = {
    'admin': 'Administrator',
    'operations': 'Operations',
    'operation-manager': 'Operations Manager', 
    'sales': 'Sales',
    'sales-manager': 'Sales Manager',
    'driver': 'Driver'
  };

  const roleList = requiredRoles
    .filter(role => role !== 'admin') // Remove admin from tooltip display
    .map(role => roleNames[role as keyof typeof roleNames] || role)
    .join(' or ');
  
  return roleList ? `Only ${roleList} can ${action.toLowerCase()}` : `${action} available`;
};

export const formatDateTime = (dateTime: string) => {
  return new Date(dateTime).toLocaleString();
};

export const getStatusColor = (status: CaseStatus): string => {
  switch (status) {
    case 'Case Booked': return '#ff9800';
    case 'Order Preparation': return '#e91e63';
    case 'Order Prepared': return '#9c27b0';
    case 'Pending Delivery (Hospital)': return '#4caf50';
    case 'Delivered (Hospital)': return '#00bcd4';
    case 'Case Completed': return '#8bc34a';
    case 'Delivered (Office)': return '#607d8b';
    case 'To be billed': return '#795548';
    case 'Case Cancelled': return '#f44336';
    default: return '#757575';
  }
};