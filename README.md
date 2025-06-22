# Medical Case Booking System

A comprehensive web application for managing medical case bookings with hospital/medical background themes and user access control.

## Features

### 🔐 Authentication System
- Secure login system with user access matrix
- Default admin account (Username: `Admin`, Password: `Admin`)
- Role-based access control (Admin and User roles)

### 📋 Case Management
- **Case Booking Form** with required and optional fields:
  - Hospital (Required)
  - Department (Required)
  - Date of Surgery (Required)
  - Procedure Type/Name (Required)
  - Time of Procedure (Optional)
  - Surgery Set Selection - Multi-select dropdown (Required)
  - Implant Box - Multi-select dropdown (Required)
  - Special Instructions (Optional)

### 📊 Status Workflow
- **Booking of case** - Initial status upon creation
- **Pending Preparation** - After case submission
- **Order Prepared** - After processing
- **Order delivered (Hospital)** - Delivered to hospital
- **Case Completed** - Case finished
- **Order delivered (Return)** - Equipment returned
- **Case Cancelled** - Optional cancellation status

### 🎯 Core Functionality
- **Case Submission**: Automatically changes status to "Pending Preparation" with submitter name
- **Process Order**: Dedicated page for detailed order processing
- **Cases List**: View all cases with advanced filtering options
- **User Management**: Admin can create and manage user accounts

### 🔍 Advanced Filtering
- Filter by submitter name
- Filter by hospital
- Filter by status
- Date range filtering
- Real-time filter application

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Custom CSS with medical/hospital theme
- **State Management**: React hooks and local storage
- **Data Persistence**: Browser localStorage
- **Icons**: Lucide React icons

## Installation & Setup

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation Steps

1. **Clone or download the project**
   ```bash
   cd case-booking-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Access the application**
   - Open your browser and go to `http://localhost:3000`
   - Use default admin credentials:
     - Username: `Admin`
     - Password: `Admin`

## Usage Guide

### Getting Started
1. **Login**: Use the default admin credentials or create additional users
2. **Create Case**: Fill out the case booking form with all required information
3. **Submit**: Click "Submit Case Booking" to create the case
4. **View Cases**: Navigate to "View All Cases" to see all submitted cases
5. **Process Orders**: Click "Process Order" on any case to add processing details

### User Roles

#### Admin Users Can:
- Create and manage user accounts
- View all cases from all users
- Process any case
- Change case statuses
- Access user management features

#### Regular Users Can:
- Create new case bookings
- View cases they submitted
- Process orders assigned to them
- Limited status change permissions

### Case Status Flow
1. **Booking of case** → Case is initially created
2. **Pending Preparation** → Case is submitted and awaiting preparation
3. **Order Prepared** → Case has been processed and is ready
4. **Order delivered (Hospital)** → Equipment delivered to hospital
5. **Case Completed** → Surgery completed successfully
6. **Order delivered (Return)** → Equipment returned from hospital
7. **Case Cancelled** → Case cancelled (optional status)

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm eject` - Ejects from Create React App (irreversible)

## Data Storage

The application uses browser localStorage for data persistence:
- User accounts and credentials
- Case booking data
- Session management
- Application state

**Note**: Data is stored locally in the browser and will persist between sessions but won't be shared across different browsers or devices.

## Customization

### Adding New Surgery Sets or Implant Options
Edit the arrays in `src/components/CaseBookingForm.tsx`:
```typescript
const surgerySetOptions = [
  'Basic Surgery Set',
  'Orthopedic Set',
  // Add new options here
];

const implantBoxOptions = [
  'Hip Implants',
  'Knee Implants',
  // Add new options here
];
```

### Modifying Case Statuses
Update the `CaseStatus` type in `src/types/index.ts`:
```typescript
export type CaseStatus = 
  | 'Booking of case'
  | 'Pending Preparation'
  // Add new statuses here
```

### Styling Customization
The medical/hospital theme can be customized in `src/App.css`. The design features:
- Medical gradient backgrounds
- Professional color scheme
- Hospital-inspired icons and layouts
- Responsive design for all devices

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Support

For issues or questions:
1. Check the browser console for error messages
2. Ensure all required fields are filled when submitting forms
3. Verify login credentials are correct
4. Clear browser cache if experiencing data issues

## License

This project is for educational and demonstration purposes.