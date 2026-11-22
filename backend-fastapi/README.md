# RecycleIQ — Groq AI & FastAPI Setup Guide

## Architecture Overview

1. **Live Interactive Web Application (Port 3000)**:
   - React + TypeScript + Tailwind CSS frontend (`src/`)
   - Express server (`server.ts`) providing `/api/analyze`, `/api/ask`, `/api/analyses`, `/api/stats`, and `/api/health`
   - Server-side Groq Multimodal Vision & Waste Advisor integration (`server/visionProvider.ts` using `GROQ_API_KEY` and `meta-llama/llama-4-scout-17b-16e-instruct`), paired with deterministic Recyclability Rules (`server/rulesEngine.ts`) and built-in persistent database storage (`server/storageService.ts`).

2. **Standalone Python + FastAPI Backend (`backend-fastapi/`)**:
   - Companion Python REST service using SQLite (`recycleiq.db`) or standard PostgreSQL (`schema.sql`).

## Running the Python FastAPI Backend Locally

```bash
cd backend-fastapi
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
