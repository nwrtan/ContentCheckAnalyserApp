#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# Local dev script for ContentCheckAnalyserApp
#
# Acquires a Dataverse bearer token and starts the Vite dev server.
#
# Token acquisition (tries in order):
#   1. Azure CLI  (`az account get-access-token`)
#   2. PAC CLI    (`pac auth token`)    — requires PAC CLI ≥ 1.32
#   3. Manual     (prompts you to paste a token from the browser)
#
# Usage:
#   ./scripts/dev-local.sh
#   # or via npm:
#   npm run dev:local
#
# Prerequisites (at least ONE of):
#   - Azure CLI authenticated (`az login`)
#   - PAC CLI authenticated (`pac auth create --url <org>`)
#   - A bearer token copied from browser DevTools (Network tab)
# ──────────────────────────────────────────────────────────────

# Use VITE_ORG_URL env var if set, otherwise default
ORG_URL="${VITE_ORG_URL:-https://editorialworkflow.crm.dynamics.com}"
TOKEN=""

echo "🌐 Target environment: $ORG_URL"

echo "🔑 Acquiring Dataverse bearer token..."
echo ""

# ── Method 1: Azure CLI (--query + -o tsv returns raw token) ─
if [ -z "$TOKEN" ] && command -v az &> /dev/null; then
  echo "📋 Trying Azure CLI (az account get-access-token)..."
  MAYBE=$(az account get-access-token --resource "$ORG_URL" --query accessToken -o tsv 2>/dev/null) || true

  if [[ "$MAYBE" == ey* ]]; then
    TOKEN="$MAYBE"
    echo "✅ Token acquired via Azure CLI (${#TOKEN} chars)"
  else
    echo "⚠️  Azure CLI didn't return a valid token."
    echo "   Make sure you're logged in: az login"
    echo ""
  fi
fi

# ── Method 2: PAC CLI (pac auth token) ───────────────────────
if [ -z "$TOKEN" ] && command -v pac &> /dev/null; then
  echo "📋 Trying PAC CLI (pac auth token)..."

  # Show current auth profiles for context
  pac auth list 2>&1 || true
  echo ""

  RAW=$(pac auth token --resource "$ORG_URL" 2>&1) || true
  MAYBE=$(echo "$RAW" | grep -oE 'ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' | head -1)

  if [ -z "$MAYBE" ]; then
    CLEANED=$(echo "$RAW" | tr -d '[:space:]')
    if [[ "$CLEANED" == ey* ]]; then
      MAYBE="$CLEANED"
    fi
  fi

  if [[ "$MAYBE" == ey* ]]; then
    TOKEN="$MAYBE"
    echo "✅ Token acquired via PAC CLI (${#TOKEN} chars)"
  else
    echo "⚠️  PAC CLI didn't return a valid token (your version may not support 'pac auth token')."
    echo ""
  fi
fi

# ── Method 3: Manual token entry ─────────────────────────────
if [ -z "$TOKEN" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔐 No token acquired automatically."
  echo ""
  echo "To get a token manually:"
  echo "  1. Open $ORG_URL in your browser (log in if needed)"
  echo "  2. Open DevTools → Network tab"
  echo "  3. Find any request to /api/data/"
  echo "  4. Copy the Authorization header value (without 'Bearer ')"
  echo ""
  echo "Or run this in your terminal if you have Azure CLI:"
  echo "  az login"
  echo "  az account get-access-token --resource $ORG_URL --query accessToken -o tsv"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  read -r -p "Paste your bearer token (starts with 'ey'): " TOKEN

  if [[ "$TOKEN" != ey* ]]; then
    echo "❌ That doesn't look like a valid JWT token (should start with 'ey')."
    exit 1
  fi
  echo "✅ Token accepted (${#TOKEN} chars)"
fi

echo ""
echo "🚀 Starting Vite dev server in local mode..."
echo "   Open http://localhost:5173 in your browser"
echo ""

VITE_LOCAL_DEV=true VITE_ORG_URL="$ORG_URL" DATAVERSE_TOKEN="$TOKEN" npx vite --host
