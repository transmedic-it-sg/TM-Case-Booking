# Development & Production Environment Setup

This document explains how to set up separate development and production environments for the TM-Case-Booking application.

## Architecture Overview

- **Production**: `Live-CaseBooking` repository → Main Supabase branch
- **Development**: `TM-Case-Booking` repository → Development Supabase branch

## Prerequisites

1. Supabase Pro Plan (required for branching)
2. GitHub repositories set up
3. Supabase CLI installed: `npm install -g supabase`

## Setting Up Supabase Branching

### Step 1: Enable GitHub Integration

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/yjllfmmzgnapsqfddbwt
2. Navigate to **Settings** → **Integrations**
3. Install and configure **GitHub Integration**
4. Connect your production repository: `Mika-Nim/Live-CaseBooking`
5. Set the production branch to `main`

### Step 2: Create Development Branch

1. In your `TM-Case-Booking` repository, create a new branch:
   ```bash
   git checkout -b development
   git push -u origin development
   ```

2. In Supabase dashboard:
   - Go to **Branches** tab
   - Click **"Create preview branch"**
   - Select repository: `TM-Case-Booking`
   - Select branch: `development`
   - Enter branch name: `dev-testing`

### Step 3: Update Environment Configuration

Once the development branch is created, you'll get new credentials:

1. Copy the development branch URL and anon key
2. Update `.env.development`:
   ```env
   REACT_APP_SUPABASE_URL=https://your-project-ref-dev-branch.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your-dev-branch-anon-key
   ```

## Repository Setup

### Development Repository (TM-Case-Booking)

```bash
# Clone development repository
git clone https://github.com/Mika-Nim/TM-Case-Booking.git
cd TM-Case-Booking

# Set up development environment
./scripts/setup-environment.sh development

# Install dependencies
npm install

# Start development server
npm start
```

### Production Repository (Live-CaseBooking)

```bash
# Clone production repository
git clone https://github.com/Mika-Nim/Live-CaseBooking.git
cd Live-CaseBooking

# Set up production environment
./scripts/setup-environment.sh production

# Install dependencies
npm install

# Build and deploy
npm run build
npm run deploy
```

## Environment Management

### Switching Environments

Use the setup script to quickly switch between environments:

```bash
# Switch to development
./scripts/setup-environment.sh development

# Switch to production
./scripts/setup-environment.sh production
```

### Environment Variables

| Variable | Development | Production |
|----------|-------------|------------|
| `REACT_APP_SUPABASE_URL` | Dev branch URL | Main branch URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Dev branch key | Main branch key |
| `REACT_APP_ENV` | development | production |

## Database Management

### Development Database

- Automatically synced with your development branch
- Includes all migrations and seed data
- Safe for testing and experimentation
- Auto-pauses after 5 minutes of inactivity

### Production Database

- Connected to main Supabase branch
- Contains live user data
- Protected by RLS policies
- Always active

## Workflow

### Development Workflow

1. Work in `TM-Case-Booking` repository
2. Use development Supabase branch
3. Test new features safely
4. Commit changes to development branch

### Production Deployment

1. Merge tested changes to main branch in `Live-CaseBooking`
2. Deploy to GitHub Pages
3. Changes automatically reflected in production database

## Migration Between Laptops

### For Development Work

1. Clone `TM-Case-Booking` repository
2. Run setup script: `./scripts/setup-environment.sh development`
3. Update `.env.development` with development branch credentials
4. Start coding immediately

### For Production Access

1. Clone `Live-CaseBooking` repository
2. Run setup script: `./scripts/setup-environment.sh production`
3. Ready for production deployment

## Supabase Branch Management

### Development Branch Features

- **Cost**: $0.01344 per hour (only when active)
- **Auto-pause**: After 5 minutes of inactivity
- **Migrations**: Automatically applied from your repository
- **Seed data**: Loaded on branch creation
- **Real-time**: Full Supabase features available

### Monitoring Costs

- Check branch usage in Supabase dashboard
- Development branches auto-pause to minimize costs
- Production branch runs continuously

## Security Notes

- Keep production credentials secure
- Never commit real API keys to development branch
- Use different OAuth app credentials for dev/prod
- Test all security features in development first

## Troubleshooting

### Branch Not Creating

- Ensure GitHub integration is properly configured
- Check that your repository has the supabase directory
- Verify migrations are in correct format

### Environment Variables Not Loading

- Check file names (.env.development vs .env.production)
- Ensure setup script has executable permissions
- Restart development server after environment changes

### Database Sync Issues

- Check migration file formats
- Ensure seed data is valid SQL
- Review Supabase logs in dashboard

## Support

For issues related to:
- **Supabase Branching**: Check Supabase documentation
- **Application Code**: Submit issues to respective repository
- **Environment Setup**: Review this documentation first