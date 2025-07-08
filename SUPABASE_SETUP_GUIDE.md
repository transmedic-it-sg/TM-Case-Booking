# 🚀 Supabase + Vercel Production Setup Guide

This guide will help you migrate your Case Booking Application from localStorage to Supabase cloud database with Vercel deployment.

## 📋 **Prerequisites**

✅ **Supabase Account**: anrong.low@transmedicgroup.com  
✅ **GitHub Repository**: https://github.com/Mika-Nim/TM-Case-Booking  
✅ **Production Branch**: Created and ready  

## 🗄️ **Step 1: Set Up Supabase Database**

### **1.1 Create New Supabase Project**

1. **Login to Supabase**: https://app.supabase.com/
   - Email: anrong.low@transmedicgroup.com
   - Password: Secure@con1357$2468

2. **Create New Project**:
   - Click "New Project"
   - Name: `tm-case-booking-production`
   - Database Password: Choose a strong password (save it securely)
   - Region: Choose closest to your users (e.g., Southeast Asia)

3. **Wait for Setup**: Database initialization takes 2-3 minutes

### **1.2 Execute Database Schema**

1. **Go to SQL Editor**: Navigate to "SQL Editor" in Supabase dashboard
2. **Run Schema**: Copy and paste the entire content from `supabase/schema.sql`
3. **Execute**: Click "Run" - this creates all tables, policies, and functions
4. **Verify**: Check "Table Editor" to confirm tables are created

### **1.3 Get Project Credentials**

1. **Go to Settings**: Navigate to "Settings" → "API"
2. **Copy Values**:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **Anon Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 🔐 **Step 2: Configure Authentication**

### **2.1 Enable Email Authentication**

1. **Go to Authentication**: Navigate to "Authentication" → "Settings"
2. **Enable Email**: Ensure "Enable email signups" is checked
3. **Configure Email Templates**: Customize confirmation and reset emails
4. **Set Site URL**: Add your production domain (will be provided by Vercel)

### **2.2 Set Up Row Level Security**

✅ **Already Configured**: The schema includes comprehensive RLS policies
- Users can only see cases from their assigned countries
- Admins have full access
- Secure profile and notification access

## 🌐 **Step 3: Deploy to Vercel**

### **3.1 Connect GitHub to Vercel**

1. **Go to Vercel**: https://vercel.com/
2. **Sign Up/Login**: Use GitHub authentication
3. **Import Project**: Click "New Project" → Import from GitHub
4. **Select Repository**: Choose `Mika-Nim/TM-Case-Booking`
5. **Select Branch**: Choose `Production` branch

### **3.2 Configure Environment Variables**

In Vercel project settings, add these environment variables:

```env
# Supabase Configuration
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-from-supabase

# Email OAuth (Optional - for email notifications)
REACT_APP_MICROSOFT_CLIENT_ID=766ea716-3e33-41a9-b780-c23203f5562b
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
```

### **3.3 Deploy**

1. **Deploy**: Click "Deploy" in Vercel
2. **Wait**: Deployment takes 2-3 minutes
3. **Get URL**: You'll receive a production URL like `https://tm-case-booking.vercel.app`

## 🔄 **Step 4: Data Migration (Optional)**

If you have existing localStorage data to migrate:

### **4.1 Export Current Data**

1. **Open Current App**: Go to your GitHub Pages version
2. **Open Browser Console**: Press F12
3. **Export Data**:
```javascript
// Export all data
const exportData = {
  users: JSON.parse(localStorage.getItem('case-booking-users') || '[]'),
  cases: JSON.parse(localStorage.getItem('case-booking-cases') || '[]'),
  emailConfigs: JSON.parse(localStorage.getItem('simplified_email_configs') || '{}'),
  notificationRules: JSON.parse(localStorage.getItem('email-matrix-configs-by-country') || '{}')
}

console.log('Export this data:', JSON.stringify(exportData, null, 2))
```

### **4.2 Import to Supabase**

1. **Create Admin User**: First user in Supabase becomes admin
2. **Import Users**: Use Supabase dashboard to insert user profiles
3. **Import Cases**: Use SQL Editor to insert case data
4. **Import Configs**: Add email configurations via admin panel

## 🧪 **Step 5: Testing**

### **5.1 Test Authentication**

1. **Sign Up**: Create a new account in production app
2. **Sign In**: Test login functionality
3. **Profile**: Verify profile creation and role assignment

### **5.2 Test Case Management**

1. **Create Case**: Submit a new case booking
2. **Update Status**: Test status workflow transitions
3. **Multi-user**: Test with multiple user accounts
4. **Real-time**: Verify real-time updates between users

### **5.3 Test Email Notifications**

1. **Configure OAuth**: Set up email providers in admin panel
2. **Test Notifications**: Trigger status changes and verify emails
3. **Multi-country**: Test notifications across different countries

## 📊 **Production Features**

### **🔒 Security Features**
- **Row Level Security**: Users only see their data
- **JWT Authentication**: Secure token-based auth
- **API Rate Limiting**: Built-in DDoS protection
- **HTTPS Everywhere**: End-to-end encryption

### **⚡ Performance Features**
- **Global CDN**: Fast loading worldwide via Vercel
- **Real-time Updates**: Instant sync between users
- **Optimized Queries**: Indexed database for fast search
- **Auto-scaling**: Handles traffic spikes automatically

### **👥 Multi-user Capabilities**
- **Concurrent Access**: Multiple users working simultaneously
- **Role-based Permissions**: Different access levels
- **Real-time Notifications**: Instant updates on changes
- **Audit Trail**: Complete history of all changes

## 🔧 **Administration**

### **User Management**
- **Add Users**: Admin can create accounts via Supabase Auth
- **Assign Roles**: Set user roles and permissions
- **Country Access**: Control which countries users can access
- **Enable/Disable**: Activate or deactivate user accounts

### **Database Management**
- **Supabase Dashboard**: Full database admin interface
- **Backups**: Automatic daily backups
- **Monitoring**: Real-time performance metrics
- **Logs**: Comprehensive error and access logging

## 🆘 **Support & Troubleshooting**

### **Common Issues**

1. **Authentication Errors**: Check Supabase auth settings
2. **RLS Violations**: Verify user has correct country access
3. **Build Failures**: Check environment variables in Vercel
4. **Email Issues**: Verify OAuth configuration

### **Getting Help**

- **Supabase Docs**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **GitHub Issues**: Report bugs in repository
- **Database Console**: Use Supabase SQL editor for debugging

---

## 🎯 **Next Steps**

Once production is live:

1. **Custom Domain**: Add your company domain in Vercel
2. **SSL Certificate**: Automatic HTTPS via Vercel
3. **Monitoring**: Set up error tracking and analytics
4. **Backup Strategy**: Configure additional backup policies
5. **Team Training**: Train users on the new cloud system

**Your application will be production-ready with enterprise-grade security and scalability!**