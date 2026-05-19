#!/bin/bash
# ============================================================
# deploy.sh — Full deployment script for ClinicAssist AI
# Run this on the VPS after git pull
# Usage: bash deploy.sh
# ============================================================

set -e  # Exit on any error

ROOT="/root/ai_voice_receptionist"
VENV="$ROOT/backend/venv"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║     ClinicAssist AI — Deployment Script      ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 0. Create logs directory ──────────────────────────────
mkdir -p "$ROOT/logs"
echo "✅ Logs directory ready"

# ── 1. Pull latest code ───────────────────────────────────
echo ""
echo "📦 Pulling latest code from git..."
cd "$ROOT"
git pull origin main
echo "✅ Code updated"

# ── 2. Install Python dependencies ───────────────────────
echo ""
echo "🐍 Installing Python dependencies..."
cd "$ROOT/backend"
"$VENV/bin/pip" install -r requirements.txt --quiet
echo "✅ Python dependencies installed"

# ── 3. Build Next.js frontend ─────────────────────────────
echo ""
echo "⚛️  Building Next.js frontend..."
cd "$ROOT/voice_bot"
npm install --silent
npm run build
echo "✅ Frontend built"

# ── 4. Start/Restart PM2 services ────────────────────────
echo ""
echo "🚀 Starting PM2 services..."
cd "$ROOT"

# If PM2 processes already exist, restart them; otherwise start fresh
if pm2 list | grep -q "backend"; then
    echo "   Restarting existing PM2 processes..."
    pm2 restart ecosystem.config.js
else
    echo "   Starting PM2 for the first time..."
    pm2 start ecosystem.config.js
fi

# ── 5. Save PM2 process list ──────────────────────────────
pm2 save
echo "✅ PM2 process list saved"

# ── 6. Set up auto-start on reboot (first time only) ─────
# pm2 startup  ← run this manually once if not done already

# ── 7. Show status ───────────────────────────────────────
echo ""
echo "📊 Current PM2 status:"
pm2 status

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║         ✅ Deployment Complete!              ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Useful commands:"
echo "  pm2 logs voice-agent     ← stream agent logs"
echo "  pm2 logs backend         ← stream backend logs"
echo "  pm2 restart voice-agent  ← restart only the agent"
echo "  pm2 monit                ← live CPU/memory dashboard"
echo ""
