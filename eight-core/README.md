# EIGHT Core - Standalone System Builder

A standalone AI-powered system builder that can be deployed to Google Cloud Run, giving you full control over your ecosystem outside of Vercel.

## Features

- **AI Chat**: Talk to Eight and execute commands
- **SQL Console**: Direct database access
- **File Operations**: Read, write, list, delete files
- **User Management**: List users, fund wallets
- **Stats & Health**: Monitor your system

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/chat` | POST | Chat with Eight AI |
| `/execute` | POST | Execute action |
| `/sql` | POST | Run SQL query |
| `/files` | POST | File operations |
| `/stats` | GET | System statistics |
| `/users` | GET | List users |
| `/fund` | POST | Fund user wallet |
| `/schema` | GET | Database schema |

## Deploy to Google Cloud Run

### Prerequisites

1. Google Cloud account with billing enabled
2. `gcloud` CLI installed and authenticated
3. Your Neon DATABASE_URL
4. (Optional) Google AI API key for chat

### Quick Deploy

```bash
# Set environment variables
export GCP_PROJECT_ID="your-project-id"
export DATABASE_URL="postgresql://..."
export GOOGLE_AI_KEY="your-key"  # optional

# Deploy
chmod +x deploy.sh
./deploy.sh
```

### Manual Deploy

```bash
# Build and deploy
gcloud run deploy eight-core \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=your-connection-string"
```

## Local Development

```bash
# Install dependencies
npm install

# Set environment
export DATABASE_URL="your-neon-connection-string"

# Run locally
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `GOOGLE_AI_KEY` | No | Google AI API key for chat feature |
| `PORT` | No | Server port (default: 8080) |
| `PROJECT_ROOT` | No | Root path for file operations |

## Usage Examples

### Chat with Eight
```bash
curl -X POST https://your-service.run.app/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Show me all users"}]}'
```

### Run SQL
```bash
curl -X POST https://your-service.run.app/sql \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM users LIMIT 10"}'
```

### Get Stats
```bash
curl https://your-service.run.app/stats
```

### Fund Wallet
```bash
curl -X POST https://your-service.run.app/fund \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-uuid", "amount": 100, "target": "core"}'
```

## Security Notes

- For production, add authentication middleware
- Use Cloud Run IAM for access control
- Store secrets in Secret Manager
- Enable VPC connector for database access
