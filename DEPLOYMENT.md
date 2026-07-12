# System Bridge Frontend - Deployment Guide

## Quick Start

### Prerequisites
- Google Cloud Project with Cloud Run enabled
- `gcloud` CLI installed and authenticated
- PostgreSQL database (Neon recommended)
- Environment variables configured in Cloud Build secrets

### Deploy to Google Cloud Run

1. **Set up Cloud Build secrets:**

```bash
echo -n 'your-database-url' | gcloud secrets create DATABASE_URL --data-file=-
echo -n 'your-nextauth-secret' | gcloud secrets create NEXTAUTH_SECRET --data-file=-
echo -n 'https://your-domain.com' | gcloud secrets create NEXTAUTH_URL --data-file=-
echo -n 'your-google-ai-key' | gcloud secrets create GOOGLE_AI_KEY --data-file=-
```

2. **Update `cloudbuild.yaml` substitutions:**

Edit the substitutions at the bottom to reference your secrets:

```yaml
substitutions:
  _DATABASE_URL: '${_DATABASE_URL}'
  _NEXTAUTH_SECRET: '${_NEXTAUTH_SECRET}'
  _NEXTAUTH_URL: '${_NEXTAUTH_URL}'
  _GOOGLE_AI_KEY: '${_GOOGLE_AI_KEY}'
```

3. **Trigger deployment:**

```bash
# Manual trigger with substitutions
gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions=_DATABASE_URL='postgresql://...',_NEXTAUTH_SECRET='...',_NEXTAUTH_URL='https://...',_GOOGLE_AI_KEY='...'

# Or push to main branch to auto-trigger
git push origin fix/api-500-errors
```

4. **Monitor the build:**

```bash
gcloud builds log --stream <BUILD_ID>
```

## API Endpoints

### Fixed Endpoints
- `GET /api/notifications?userId=<id>&unreadOnly=true` - Fetch notifications
- `POST /api/notifications` - Create notification
- `GET /api/arena/matches?limit=50` - List arena matches
- `POST /api/arena/matches` - Create new match
- `GET /api/wallet/transfer?userId=<id>` - Get wallet balances
- `POST /api/wallet/transfer` - Transfer between wallets
- `GET /api/admin/users?filter=unassigned` - List users (admin only)
- `PUT /api/admin/users` - Assign user department (admin only)

## What Was Fixed

1. **Database Connection Pool** - Improved connection handling for serverless environments
2. **Error Handling** - Better error messages and proper HTTP status codes (503 for service unavailable)
3. **Environment Variables** - Proper validation and error messages when not configured
4. **Cloud Run Configuration** - Added memory, timeout, and instance limits
5. **Docker Build** - Optimized multi-stage build with proper environment variable passing

## Troubleshooting

### 503 Errors
The service returns 503 (Service Unavailable) when:
- Database connection fails
- Database query timeout
- Environment variables are not set

Check Cloud Run logs:
```bash
gcloud run logs system-bridge-frontend --region us-central1 --limit 50
```

### Database Connection Issues
1. Verify DATABASE_URL is set correctly
2. Check Neon database is accessible from Cloud Run
3. Verify SSL settings for your database

### Authentication Failures
1. Ensure NEXTAUTH_SECRET is set
2. Verify NEXTAUTH_URL matches your Cloud Run service URL
3. Check NextAuth configuration in `lib/auth.ts`

## Local Testing

```bash
# Install dependencies
npm install

# Set environment variables
export DATABASE_URL="postgresql://..."
export NEXTAUTH_SECRET="your-secret"
export NEXTAUTH_URL="http://localhost:3000"

# Run locally
npm run dev

# Test API
curl http://localhost:3000/api/notifications?userId=<test-id>
```
