# Transmedic Case Booking System

## Version 1.2.3

A comprehensive React-based case booking application for medical procedures with advanced role-based access control, workflow management, and Supabase integration.

## 🚀 Features

### Core Functionality
- **Case Management**: Create, view, and manage medical case bookings
- **Amendment System**: Configurable amendment policies with detailed history tracking
- **Status Workflow**: Complete medical procedure workflow from booking to billing
- **Role-Based Access**: Granular permissions for different user roles
- **Multi-Country Support**: Singapore, Malaysia, Philippines, Indonesia, Vietnam, Hong Kong, Thailand

### Latest Features (v1.2.3)
- **✨ Amendment Time Configuration**: System-wide configurable amendment policies
- **🔧 Enhanced Amendment History**: Professional before/after change tracking with color coding
- **🛡️ Fixed IT Role Permissions**: Complete status transition access for IT users
- **🎨 UI Improvements**: Fixed toggle switches, simplified Global Tables interface
- **⚡ Supabase Integration**: Full database integration with real-time updates

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel
- **Styling**: CSS3 with responsive design

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
- `Version-1.2.3`: Current version branch
- `UAT`: User acceptance testing branch

## 📝 Changelog

### Version 1.2.3 (Latest)
- **Enhancement**: Amendment time configuration in System Settings
- **Enhancement**: Professional amendment history display with change tracking
- **Fix**: IT role permissions for all status transitions
- **Fix**: Toggle switch styling issues
- **Enhancement**: Simplified Global Tables interface
- **Database**: Added amendment configuration fields
- **Security**: Fixed audit logs RLS policies

### Previous Versions
See `CHANGELOG_v1.2.3.md` for complete version history.

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

**Version**: 1.2.3  
**Last Updated**: 2025-01-21  
**Deployment**: Production Ready  
**License**: Proprietary