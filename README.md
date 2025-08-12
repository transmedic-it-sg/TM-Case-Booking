# Transmedic Case Booking System

## Version 1.2.6

A comprehensive React-based case booking application for medical procedures with advanced role-based access control, workflow management, and professional mobile experience.

## 🚀 Features

### Core Functionality
- **Case Management**: Create, view, and manage medical case bookings
- **Amendment System**: Configurable amendment policies with detailed history tracking
- **Status Workflow**: Complete medical procedure workflow from booking to billing
- **Role-Based Access**: Granular permissions for different user roles
- **Multi-Country Support**: Singapore, Malaysia, Philippines, Indonesia, Vietnam, Hong Kong, Thailand

### Latest Features (v1.2.6)
- **📱 Enhanced Mobile Layout**: Refined 2-row mobile case card structure with proper column sizing
- **🎬 Smooth Animations**: Added expand/collapse animations with modern cubic-bezier transitions
- **🎯 Context-Specific Icons**: Separated expand-icon styling for section-header vs case-summary
- **✨ Interactive Effects**: Hover animations, rotation effects, and smooth content transitions
- **📐 Layout Optimization**: Fixed mobile case-title and case-meta equal sizing issues
- **🖱️ Better UX**: Enhanced touch interactions with visual feedback and smooth transitions
- **🔧 CSS Architecture**: Improved mobile-first approach with better component isolation
- **⚡ Performance**: Hardware-accelerated animations for smooth 60fps mobile experience

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 with TypeScript
- **Mobile**: Progressive Web App (PWA) with native app features
- **Database**: Supabase (PostgreSQL) with RLS policies
- **Authentication**: Supabase Auth
- **Deployment**: Vercel with production optimization
- **Styling**: Mobile-first CSS3 with responsive breakpoints

### Key Components
- **Amendment System**: Configurable time limits and maximum amendments per case
- **Status Transitions**: Complete workflow from case booking to billing
- **User Management**: Role-based access with department and country assignments
- **Audit System**: Comprehensive logging of all user actions
- **Notification System**: Real-time notifications for workflow changes

## 🛠️ Installation

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Supabase account

### Setup
1. **Clone the repository**
   ```bash
   git clone https://github.com/Mika-Nim/TM-Case-Booking.git
   cd TM-Case-Booking
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Configure your Supabase credentials
   ```

4. **Database Setup**
   - Execute SQL migrations in your Supabase dashboard
   - See `PRODUCTION_MIGRATION_v1.2.3.sql` for latest schema

5. **Start Development Server**
   ```bash
   npm start
   ```

## 🎯 User Roles & Permissions

### Role Hierarchy
- **Admin**: Full system access, user management
- **IT**: System management, all status transitions, user administration
- **Operations/Operations Manager**: Order processing, hospital delivery management
- **Sales/Sales Manager**: Case completion, office delivery, billing
- **Driver**: Hospital delivery confirmation with image uploads

### Status Workflow
```
Case Booked → Order Preparation → Order Prepared → 
Pending Delivery (Hospital) → Delivered (Hospital) → 
Case Completed → Pending Delivery (Office) → 
Delivered (Office) → To be Billed → Case Closed
```

## 📋 System Configuration

### Amendment Settings (v1.2.3)
- **Amendment Time Limit**: Configurable hours (1-168) after case creation
- **Maximum Amendments**: Configurable limit (1-20) per case
- **Change Tracking**: Detailed before/after value recording
- **History Display**: Professional interface with color-coded changes

### Global Tables Management
- **Countries**: Global country list management
- **Departments**: Medical departments by country
- **Procedure Types**: Customizable procedure classifications
- **Code Tables**: System reference data management

## 🔧 Development

### Build Commands
```bash
npm start          # Development server
npm run build      # Production build
npm run typecheck  # TypeScript validation
npm test          # Run tests
```

### Code Quality
- TypeScript strict mode enabled
- ESLint configuration
- Component documentation
- Comprehensive error handling

## 📊 Database Schema

### Core Tables
- `case_bookings`: Medical case information and workflow status
- `amendment_history`: Detailed change tracking with timestamps
- `status_history`: Complete status transition audit trail
- `system_settings`: Configurable application settings
- `audit_logs`: Comprehensive user action logging

### Key Features
- Row Level Security (RLS) policies
- Real-time subscriptions
- Automatic timestamp tracking
- Foreign key relationships
- Data validation constraints

## 🚀 Deployment

### Production Deployment
The application is deployed on Vercel:
- **Production URL**: [https://tm-case-booking-e7fne164f-an-rong-lows-projects.vercel.app](https://tm-case-booking-e7fne164f-an-rong-lows-projects.vercel.app)
- **Automatic deployments** from Production branch
- **Environment variables** configured in Vercel dashboard

### Branch Structure
- `main`: Stable release branch
- `Production`: Production deployment branch  
- `Version-1.2.6`: Current version branch
- `Version-1.2.5`: Previous version branch
- `UAT`: User acceptance testing branch

## 📝 Changelog

### Version 1.2.6 (Latest)
#### 🎬 Enhanced Mobile Animations & Layout
- **Mobile Layout Refinement**: Perfected 2-row mobile case card structure with case-title and case-meta in equal columns, expand-icon spanning full width below
- **Context-Specific Styling**: Separated expand-icon styling between section-header (small inline indicators) and case-summary (prominent interactive buttons)
- **Smooth Animation System**: Added comprehensive expand/collapse animations with modern cubic-bezier timing functions for professional feel
- **Interactive Feedback**: Implemented hover effects, rotation animations, and smooth content transitions for better user engagement

#### ✨ Mobile UX Improvements
- **Hardware-Accelerated Animations**: Used `translateZ(0)` and GPU acceleration for smooth 60fps performance on mobile devices
- **Touch-Friendly Interactions**: Enhanced expand-icon with larger touch targets, visual feedback, and responsive press animations
- **Content Reveal Animations**: Smooth slide-in effects for expanded case details with opacity transitions and height animations
- **Mobile-First Architecture**: Improved CSS organization with better component isolation and mobile-specific styling

#### 🔧 Technical Enhancements
- **Animation Performance**: Optimized animations using cubic-bezier timing and hardware acceleration
- **CSS Specificity**: Better selector targeting to prevent styling conflicts between different UI contexts  
- **Layout Stability**: Fixed mobile column sizing issues ensuring consistent visual balance
- **Web View Compatibility**: Maintained desktop experience while enhancing mobile interface

### Version 1.2.5
#### 📱 Complete Mobile UI Transformation
- **Professional Mobile Experience**: Complete redesign with native app-like interface
- **Mobile Entry Page**: Welcome screen with smooth "Proceed to Login" transition (mobile only)
- **Bottom Navigation Bar**: Native mobile app navigation with tab icons
- **Horizontal Pagination Controls**: Fixed wrapping issues, now scrollable horizontally
- **Mobile-First CSS Architecture**: Comprehensive mobile component optimization

#### 🎨 Mobile UX Enhancements  
- **Standardized Text Sizing**: Consistent 10px font sizing across all mobile case elements
- **Status Positioning**: Moved status badges to top-right corner for better mobile layout
- **Modern Checkbox Design**: Replaced MultiSelectDropdown with CheckboxList component matching reference design
- **Mobile Popup Management**: Fixed z-index layering issues for notifications and database connectivity

#### 🔧 Technical Improvements
- **Amendment History Data Fix**: Resolved Supabase data mapping issues preventing amendment history display
- **Mobile Component Architecture**: Organized mobile-specific CSS in `/src/assets/components/`
- **Device Detection**: Smart mobile device detection for conditional mobile entry page
- **PWA Features**: Enhanced Progressive Web App capabilities with mobile manifest
- **Build Optimization**: Improved Vercel deployment with CI warning handling

#### 🐛 Bug Fixes & Performance
- **Amendment History Population**: Fixed interface mismatch between expected nested format and actual row-per-change data structure
- **Mobile Pagination**: Resolved horizontal overflow and wrapping issues on small screens  
- **CSS Import Organization**: Consolidated and reorganized stylesheet imports
- **TypeScript Compilation**: Fixed unused import warnings and compilation issues
- **Mobile Memory Optimization**: Improved performance for mobile devices

### Version 1.2.4
#### 🗄️ Database Improvements
- **Complete Database Schema Rebuild**: New tables with proper structure (profiles, permissions, code_tables, case_bookings, status_history, amendment_history, notifications)
- **Fixed Supabase Connectivity**: Resolved all 400 errors and infinite loops
- **Enhanced Authentication**: New profiles table with role-based permissions
- **Improved RLS Policies**: Proper row-level security implementation
- **Schema Standardization**: Consistent data types and relationships

#### 🎨 User Interface Enhancements
- **Enlarged Edit User Modal**: Increased from 900px to 1200px width, 95vh height
- **Standardized Confirmation Popups**: Professional modals for Delete/Disable/Enable user actions
- **Fixed Advanced Filters**: Resolved emoji overlapping with placeholder text
- **Grid Layout Filters**: Changed from column to responsive grid layout
- **Enhanced Modal Interactions**: ESC key and click-outside-to-close functionality

#### 🐛 Bug Fixes
- **Department Display Issue**: Fixed inconsistency between user display and edit forms
- **TypeScript Compilation**: Resolved all compilation warnings and errors
- **React Hook Dependencies**: Fixed useEffect dependency issues
- **Permission Service**: Updated for new database schema
- **Case Service**: Fixed schema mismatches and data transformation

#### 🧹 Code Quality Improvements
- **File Cleanup**: Removed unnecessary SQL files and documentation
- **Import Optimization**: Cleaned up unused imports and variables
- **Error Handling**: Improved fallback mechanisms and error reporting
- **Code Organization**: Better structure and component separation

### Version 1.2.3
- **Enhancement**: Amendment time configuration in System Settings
- **Enhancement**: Professional amendment history display with change tracking
- **Fix**: IT role permissions for all status transitions
- **Fix**: Toggle switch styling issues
- **Enhancement**: Simplified Global Tables interface
- **Database**: Added amendment configuration fields
- **Security**: Fixed audit logs RLS policies

### Previous Versions
See version control history for complete changelog.

## 🛡️ Security

### Authentication
- Supabase Auth integration
- Role-based access control
- Session management
- Password complexity requirements

### Data Protection
- Row Level Security policies
- Audit trail for all changes
- Secure API endpoints
- Environment variable protection

## 📞 Support

### Development Team
- **Repository**: [https://github.com/Mika-Nim/TM-Case-Booking](https://github.com/Mika-Nim/TM-Case-Booking)
- **Issues**: GitHub Issues for bug reports
- **Documentation**: Comprehensive inline documentation

### System Requirements
- **Browser**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage for attachments

## 📈 Performance

### Optimization Features
- React.memo for component optimization
- useMemo for expensive calculations
- Lazy loading for large datasets
- Optimized bundle size (~214KB gzipped)
- CDN deployment via Vercel

### Monitoring
- Real-time error tracking
- Performance metrics
- User action analytics
- Database query optimization

## 🎯 Future Roadmap

### Planned Features
- Mobile application support
- Advanced reporting dashboard
- Integration with hospital systems
- Automated workflow notifications
- Multi-language support

---

**Version**: 1.2.6  
**Last Updated**: 2025-08-12  
**Deployment**: Production Ready with Enhanced Mobile Animations  
**License**: Proprietary