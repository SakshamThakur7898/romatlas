# 📱 ROMAtlas

> **The Android Custom ROM & Device Ecosystem, Organized.**  
> A source-linked directory of Android devices, custom ROMs, recoveries, kernels, and installation guides, powered by the **MERN stack**, **TypeScript**, and a **grounded AI assistant**.

---

## 📖 Table of Contents
- [What is ROMAtlas?](#-what-is-romatlas)
- [How It Uses the MERN Stack](#-how-it-uses-the-mern-stack)
- [How It Uses AI (Anti-Hallucination RAG)](#-how-it-uses-ai-anti-hallucination-rag)
- [Other Key Technologies](#-other-key-technologies)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Getting Started Locally](#-getting-started-locally)
- [Available Scripts](#-available-scripts)
- [API Overview](#-api-overview)

---

## 🌟 What is ROMAtlas?

In the Android enthusiast community, finding reliable software for your specific phone is notoriously fragmented across forums, Telegram channels, and scattered websites. Downloading or flashing the wrong file can **permanently brick** a device.

**ROMAtlas** solves this by providing:
1. **Verified Compatibility Matrix**: Maps exact devices (by codename like `surya` or model number like `M2007J20CG`) to compatible ROMs, TWRP/OrangeFox recoveries, and kernels.
2. **100% Source-Linked**: Every download and guide links back to its verified developer source (GitHub, official ROM portals, XDA).
3. **Safe AI Device Assistant**: An intelligent assistant that answers compatibility questions strictly using verified database records without hallucinating dangerous advice.

---

## 🥞 How It Uses the MERN Stack

ROMAtlas is built on top of the **MERN** stack:

| Technology | Role in ROMAtlas |
| :--- | :--- |
| **M — MongoDB** | The NoSQL database storing structured collections for devices, ROM support entries, recoveries, kernels, guides, audit logs, and users. Enforced with strict Mongoose schemas and indexes for sub-millisecond lookups. |
| **E — Express 5** | The backend REST API server (`apps/api`). Handles routing, security middleware (rate-limiting, CORS, Helmet headers), cookie-based authentication, and AI resolution. |
| **R — React 18** | The interactive single-page frontend application (`apps/web`). Features responsive device catalogs, detailed 8-tab device specifications, dynamic search palettes, and dark/light themes. |
| **N — Node.js** | The server-side runtime executing the backend API, database seed scripts, and build tooling. |

---

## 🧠 How It Uses AI (Anti-Hallucination RAG)

### The Problem with Standard AI
Standard AI models (like ChatGPT) often **hallucinate** device specifications or compatibility. If an AI gives an incorrect guide or wrong recovery file for a phone, the user's phone can be permanently damaged.

### The ROMAtlas Solution: Grounded RAG
ROMAtlas uses **Retrieval-Augmented Generation (RAG)** powered by **NVIDIA NIM** (`llama-3.1-nemotron-70b-instruct`) with strict anti-hallucination guardrails:

```
User asks: "Can I flash LineageOS 21 on my POCO X3 NFC?"
                          │
                          ▼
1. Deterministic Device Resolution (Exact match: codename "surya", model "M2007J20CG")
   * Never fuzzy-guesses. If ambiguous or unknown, stops immediately without calling LLM.
                          │
                          ▼
2. Verified Database Retrieval (Queries MongoDB for official ROM support, recoveries, & guides)
                          │
                          ▼
3. Injected Guardrail Context (<context>...</context> injected into strict system prompt)
   * Instructions: "Answer ONLY from context data. Never infer compatibility. Temperature = 0.1"
                          │
                          ▼
4. NVIDIA NIM AI Response Generation
                          │
                          ▼
Transparent 3-Layer Response returned to user:
  • AI Explanation: Clear, concise summary of compatibility.
  • Verified Records: Raw database records showing maintainers & status.
  • Source Links: Direct links to official download & documentation URLs.
```

---

## 🛠️ Other Key Technologies

- **TypeScript (End-to-End)**: Shared type safety across both frontend and backend to eliminate runtime type mismatches.
- **Vite**: Modern, hyper-fast frontend build tool and dev server with instant Hot Module Replacement (HMR).
- **Zod**: Runtime schema validation for API request bodies, query strings, and environment variables.
- **Tailwind CSS**: Utility-first CSS framework providing a curated aesthetic with dark and light mode themes.
- **TanStack React Query**: Manages frontend asynchronous state, intelligent caching, and background refetching.
- **Secure Authentication**:
  - Short-lived Access Tokens (JWT, 15m expiry).
  - Long-lived Refresh Tokens (7d expiry) stored in `HttpOnly`, `SameSite` cookies.
  - Automatic refresh token rotation with token reuse detection (revokes sessions if compromised).
- **Security & DoS Protection**:
  - **Helmet**: Hardens HTTP security headers.
  - **Express Rate Limit**: General rate-limiting + strict limit (10 req/min) on AI endpoints.
- **Vitest & Supertest**: Fast, modern test runner for unit, model, and endpoint security testing.

---

## 📐 System Architecture

```
[ Browser / Client ]
        │
        ├── Port 5173 (Vite + React 18 + Tailwind CSS)
        │       │
        │       └── /api proxy
        ▼
[ Express 5 REST API (Port 4000) ]
        │
        ├── Middlewares: Helmet, CORS, Request ID, Rate Limiter, Auth JWT
        ├── Controllers: Devices, ROMs, Guides, Updates, Users, Reports, AI
        │
        ├──► [ MongoDB (Port 27017) ] ── (Mongoose Models & Indexes)
        │
        └──► [ NVIDIA NIM API ] ──────── (Llama 3.1 Nemotron 70B Instruct)
```

---

## 📂 Project Structure

This project is organized as an **NPM Monorepo**:

```
romatlas/
├── apps/
│   ├── api/                     # Backend Express 5 REST API
│   │   ├── src/
│   │   │   ├── config/          # Environment (Zod) & DB connection
│   │   │   ├── controllers/     # Route logic (AI, auth, devices, etc.)
│   │   │   ├── middleware/      # Auth, rate limiting, error handlers
│   │   │   ├── models/          # Mongoose database schemas
│   │   │   ├── routes/          # Express route definitions
│   │   │   ├── scripts/         # Dev seed scripts (`seed.ts`)
│   │   │   ├── services/        # Device search and resolution services
│   │   │   └── utils/           # JWT, slug, logger utilities
│   │   └── tests/               # Vitest suites (models, health, security)
│   │
│   └── web/                     # Frontend React + Vite application
│       ├── src/
│       │   ├── components/      # UI components (Layout, SearchPalette, UI primitives)
│       │   ├── lib/             # API client, TanStack hooks, types, formatters
│       │   ├── pages/           # Home, Devices, DeviceDetail, ROMs, RomDetail, Updates
│       │   └── index.css        # Tailwind styling & color tokens
│       └── vite.config.ts       # Vite configuration with API reverse proxy
│
├── docker-compose.yml           # Local MongoDB container definition
├── package.json                 # Monorepo workspaces configuration
└── README.md
```

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- **Node.js**: v20+ or v22+
- **NPM**: v10+
- **MongoDB**: Local MongoDB instance or Docker (optional if running in dev preview)

### 2. Installation
Clone the repository and install all dependencies:
```bash
npm install
```

### 3. Environment Configuration
Copy the example environment configuration:
```bash
cp .env.example apps/api/.env
```

Key environment variables in `apps/api/.env`:
```ini
PORT=4000
MONGODB_URI=mongodb://localhost:27017/romatlas
CLIENT_ORIGIN=http://localhost:5173

# Optional: NVIDIA NIM API Key for AI Assistant
NIM_API_KEY=your_nvidia_nim_api_key_here
```

### 4. Database Setup (Optional for Full Features)
Start a local MongoDB database using Docker:
```bash
docker compose up -d mongo
```
Seed initial devices, ROMs, and compatibility records:
```bash
npm run seed -w apps/api
# Use --force to reset and replace existing seed data:
npm run seed -w apps/api -- --force
```

### 5. Running the Application
Run both backend and frontend servers:

```bash
# Terminal 1: Start API server (http://localhost:4000)
npm run dev:api

# Terminal 2: Start Web UI (http://localhost:5173)
npm run dev:web
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser!

---

## 📜 Available Scripts

Run these from the root directory:

| Command | Description |
| :--- | :--- |
| `npm run dev:api` | Starts the Express API server with automatic reloads via `tsx watch` |
| `npm run dev:web` | Starts the Vite React frontend dev server |
| `npm test` | Runs the Vitest test suite across all packages |
| `npm run typecheck` | Validates TypeScript types across both `apps/api` and `apps/web` |
| `npm run lint` | Runs ESLint across the codebase |
| `npm run build` | Builds both backend (tsc) and frontend (Vite production bundle) |

---

## 🔌 API Overview

All API endpoints are prefixed with `/api`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status and database connectivity |
| `POST` | `/api/auth/register` | Register a new user account |
| `POST` | `/api/auth/login` | Login and receive access token + refresh cookie |
| `POST` | `/api/auth/refresh` | Rotate refresh token and issue new access token |
| `GET` | `/api/devices` | List and search devices (with filtering & pagination) |
| `GET` | `/api/devices/:slug` | Get full device specifications and compatibility matrix |
| `GET` | `/api/roms` | List supported custom ROMs |
| `GET` | `/api/guides` | List verified installation and flashing guides |
| `POST` | `/api/ai/ask` | Ask the AI device assistant (rate-limited, grounded RAG) |
| `POST` | `/api/submissions` | Submit new device/ROM compatibility reports |
| `POST` | `/api/reports` | Report broken links or outdated information |

---

## 📄 License
This project is open-source under the MIT License.
