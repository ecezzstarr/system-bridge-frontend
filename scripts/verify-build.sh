#!/bin/bash

set -euo pipefail

export NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-build-only-verification-secret}"
export NEXT_PUBLIC_NEXTAUTH_URL="${NEXT_PUBLIC_NEXTAUTH_URL:-http://localhost:3000}"

npm run build
