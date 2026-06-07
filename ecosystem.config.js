// PM2 Ecosystem Configuration — ClinicAssist AI
// All 3 services: FastAPI Backend + LiveKit Voice Agent + Next.js Frontend
//
// USAGE ON SERVER:
//   pm2 start ecosystem.config.js        ← start all
//   pm2 restart all                      ← restart all
//   pm2 restart voice-agent              ← restart only voice agent
//   pm2 logs voice-agent                 ← stream agent logs
//   pm2 save                             ← save process list
//   pm2 startup                          ← auto-start on reboot


const ROOT = "/root/ai_voice_receptionist";
const VENV_PYTHON = `${ROOT}/backend/venv/bin/python3`;

module.exports = {
  apps: [

    // ─── 1. FastAPI Backend ───────────────────────────────────────────────────
    {
      name: "backend",
      script: `${ROOT}/backend/venv/bin/uvicorn`,
      args: "main:app --host 0.0.0.0 --port 8000 --workers 1",   // 1 worker (512MB RAM)
      cwd: `${ROOT}/backend`,
      interpreter: "none",
      autorestart: true,
      watch: false,
      max_memory_restart: "200M",                                  // Reduced for 512MB server
      restart_delay: 3000,
      env: {
        PYTHONPATH: `${ROOT}/backend`,
        PYTHONUNBUFFERED: "1",
      },
      error_file: `${ROOT}/logs/backend-error.log`,
      out_file: `${ROOT}/logs/backend-out.log`,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },

    // ─── 2. LiveKit Voice Agent ───────────────────────────────────────────────
    {
      name: "voice-agent",
      script: VENV_PYTHON,
      args: "livekit_agent.py start",           // 'start' = production worker mode
      cwd: `${ROOT}/backend/voice-agent`,
      interpreter: "none",
      autorestart: true,
      watch: false,
      max_memory_restart: "200M",                                  // Reduced for 512MB server
      restart_delay: 5000,                       // Wait 5s before restarting on crash
      env: {
        PYTHONPATH: `${ROOT}/backend/voice-agent:${ROOT}/backend`,
        PYTHONUNBUFFERED: "1",                   // Ensures logs appear in real-time
      },
      error_file: `${ROOT}/logs/voice-agent-error.log`,
      out_file: `${ROOT}/logs/voice-agent-out.log`,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },

    // ─── 3. Next.js Frontend ──────────────────────────────────────────────────
    {
      name: "frontend",
      script: "node_modules/.bin/next",
      args: "start",                             // 'start' runs the production build
      cwd: `${ROOT}/voice_bot`,
      interpreter: "none",
      autorestart: true,
      watch: false,
      max_memory_restart: "200M",                                  // Reduced for 512MB server
      restart_delay: 3000,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        NODE_OPTIONS: "--max-old-space-size=256",                  // Limit Node memory
      },
      error_file: `${ROOT}/logs/frontend-error.log`,
      out_file: `${ROOT}/logs/frontend-out.log`,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },

  ],
};
