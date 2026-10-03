# ROMAtlas

### The open-source Android software index for devices, custom ROMs, recoveries, kernels and installation resources.

ROMAtlas is a full-stack **MERN + TypeScript** platform that organizes Android development resources into a searchable, structured and source-linked database.

Instead of searching through scattered forum posts, GitHub repositories, Telegram channels and outdated tutorials, ROMAtlas aims to provide a single place where users can discover:

- 📱 Android devices and their codenames
- 🧩 Custom ROMs and supported devices
- 🛠️ Custom recoveries such as TWRP and OrangeFox
- ⚙️ Custom kernels
- 📖 Installation and development resources
- 🔗 Original source and download links
- 🤖 AI-assisted, database-grounded compatibility information

The project also includes a **grounded Retrieval-Augmented Generation (RAG) AI assistant** that resolves a user's exact device before answering questions and uses ROMAtlas's structured records as its source of context.

---

## ✨ Why ROMAtlas?

Android development information is distributed across many different sources.

A user looking for a custom ROM may need to determine:

1. Their exact device model.
2. Its Android codename.
3. Whether a ROM actually supports that device.
4. Which recovery is required.
5. Whether a kernel is compatible.
6. Where the official download is located.
7. Whether an installation guide applies to their specific device.

The problem becomes even more difficult when similarly named devices have different codenames or regional variants.

ROMAtlas attempts to solve this by creating a **structured, searchable and source-linked index** rather than relying on unstructured search results alone.

---

# 🚀 Features

## 📱 Device Explorer

ROMAtlas maintains structured device information including:

- Manufacturer
- Device name
- Model numbers
- Android codenames
- Supported ROMs
- Recoveries
- Kernels
- Relevant source links

Devices can be searched and explored through the frontend.

---

## 🔎 Device Search

The frontend provides a dedicated device search experience for finding devices by information such as:

- Device name
- Codename
- Model number
- Manufacturer

The backend performs structured queries against MongoDB rather than relying entirely on client-side filtering.

---

## 🧩 Custom ROM Index

ROMAtlas provides structured records for custom ROM projects and their device compatibility.

Each ROM can contain information such as:

- ROM name
- Android version
- Supported devices
- Build information
- Source repository
- Download links
- Documentation
- Compatibility information

The goal is to keep the original source available so users can independently verify information.

---

## 🛠️ Recovery & Kernel Resources

ROMAtlas is designed to index additional Android development resources including:

- TWRP
- OrangeFox
- Custom recoveries
- Custom kernels
- Device-specific resources

This allows resources related to a device to be discovered from a single location.

---

# 🤖 Grounded AI Assistant

One of the main technical features of ROMAtlas is its AI assistant.

Instead of allowing an LLM to freely answer questions about Android compatibility, ROMAtlas uses a **Retrieval-Augmented Generation (RAG)** pipeline.

### Example

A user asks:

> Can I flash LineageOS 21 on my POCO X3 NFC?

The system does not immediately send the question to the AI model.

Instead, it follows a structured pipeline.

```text
User Question
      │
      ▼
┌──────────────────────────────┐
│ Device Resolution             │
│                              │
│ Name / Model / Codename      │
│ are resolved deterministically│
└──────────────┬───────────────┘
               │
               ▼
        Exact Device Record
               │
               ▼
┌──────────────────────────────┐
│ MongoDB Retrieval             │
│                              │
│ ROMs                         │
│ Recoveries                   │
│ Kernels                      │
│ Verified source links        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Grounded Prompt              │
│                              │
│ Model is instructed to use   │
│ only the supplied records.   │
└──────────────┬───────────────┘
               │
               ▼
      NVIDIA NIM / LLM
               │
               ▼
┌──────────────────────────────┐
│ Structured AI Response       │
│                              │
│ • AI explanation             │
│ • Database records           │
│ • Original source links      │
└──────────────────────────────┘
```

### 1. Deterministic Device Resolution

ROMAtlas first attempts to identify the exact device.

It can use information such as:

- Device name
- Model number
- Codename

This is important because Android devices can have similar names while having completely different hardware or software compatibility.

If the system cannot confidently resolve a device, it can stop rather than inventing a device identity.

---

### 2. Database Retrieval

After resolving the device, ROMAtlas retrieves relevant records from MongoDB.

The retrieved context can include:

- Compatible ROMs
- Android versions
- Recovery information
- Kernel information
- Device-specific resources
- Source repositories
- Download URLs

---

### 3. Grounded Prompting

The retrieved records are supplied to the AI model as context.

The system prompt instructs the model to treat the retrieved records as **data rather than instructions** and to avoid inventing information that does not exist in the supplied context.

When the database does not contain sufficient verified information, the intended fallback response is:

```text
ROMAtlas does not currently have verified information for this.
```

This makes the AI assistant fundamentally different from a general-purpose chatbot that can answer from its pretrained knowledge alone.

---

### 4. NVIDIA NIM

ROMAtlas is designed to use NVIDIA NIM as the model-serving layer.

The current configuration uses:

```text
nvidia/llama-3.1-nemotron-70b-instruct
```

with a low temperature configuration to favor deterministic, information-grounded responses over creative generation.

---

### 5. Transparent Responses

The AI system is designed around a three-layer response model:

```text
AI Explanation
      +
ROMAtlas Database Records
      +
Original Source Links
```

The user can therefore inspect the underlying information instead of being presented with an unexplained AI-generated answer.

---

# 🏗️ System Architecture

ROMAtlas follows a standard MERN architecture with TypeScript across the application.

```text
                    ┌─────────────────────┐
                    │     User Browser     │
                    └──────────┬──────────┘
                               │
                               │ HTTPS
                               ▼
                    ┌─────────────────────┐
                    │ React + Vite        │
                    │ TypeScript          │
                    │ Tailwind CSS        │
                    │ React Query         │
                    └──────────┬──────────┘
                               │
                               │ REST API
                               ▼
                    ┌─────────────────────┐
                    │ Express 5           │
                    │ Node.js             │
                    │ TypeScript          │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
      ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
      │ MongoDB     │   │ JWT Auth    │   │ AI / NIM    │
      │ + Mongoose  │   │ + Sessions  │   │ RAG Layer   │
      └─────────────┘   └─────────────┘   └─────────────┘
```

---

# 🧱 Technology Stack

## Frontend

| Technology | Purpose |
|---|---|
| React 18 | User interface |
| Vite | Frontend tooling and development server |
| TypeScript | Static typing |
| React Router | Client-side routing |
| TanStack React Query | Server-state management |
| Zustand | Lightweight client state |
| React Hook Form | Form management |
| Zod | Client-side validation |
| Tailwind CSS | UI styling |
| Lucide React | Interface icons |

---

## Backend

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express 5 | REST API |
| TypeScript | Backend type safety |
| MongoDB | Primary database |
| Mongoose | MongoDB ODM |
| Zod | Runtime validation |
| JWT | Authentication |
| bcryptjs | Password hashing |
| Helmet | Security headers |
| express-rate-limit | API rate limiting |
| Pino | Structured logging |
| OpenAI SDK | LLM/NIM API integration |

---

## Development & Infrastructure

| Technology | Purpose |
|---|---|
| npm Workspaces | Monorepo management |
| Vitest | Automated testing |
| GitHub Actions | CI |
| Docker Compose | Local MongoDB environment |
| Render | Deployment |
| MongoDB Atlas | Production database |

---

# 🗂️ Project Structure

```text
romatlas/
│
├── apps/
│   │
│   ├── api/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── controllers/
│   │   │   ├── jobs/
│   │   │   ├── middleware/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── scripts/
│   │   │   ├── utils/
│   │   │   ├── validators/
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   │
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── lib/
│       │   ├── stores/
│       │   ├── App.tsx
│       │   └── main.tsx
│       │
│       ├── package.json
│       └── vite.config.ts
│
├── docs/
│   └── DATA_SOURCES.md
│
├── package.json
├── package-lock.json
└── README.md
```

---

# 🗄️ Database

MongoDB is the primary data store.

Mongoose is used as the ODM layer and provides schema definitions, validation and indexes.

The database is designed to represent relationships between entities such as:

```text
Device
  │
  ├── ROMs
  │
  ├── Recoveries
  │
  ├── Kernels
  │
  └── Sources
```

Device identifiers such as codenames can be normalized to maintain consistency.

For example:

```text
surya
```

rather than multiple inconsistent representations of the same codename.

URLs are also validated to ensure they follow the expected HTTPS format.

---

# 📥 Data Import & Synchronization

ROMAtlas does not rely exclusively on manually entered data.

The project contains importer/synchronization scripts for external sources.

Data source documentation is maintained in:

```text
docs/DATA_SOURCES.md
```

The synchronization process can be started with:

```bash
npm run sync -w apps/api -- all
```

The development seed can be run with:

```bash
npm run seed -w apps/api
```

To replace the existing development seed data:

```bash
npm run seed -w apps/api -- --force
```

The import pipeline is intended to transform external Android data into structured ROMAtlas records.

---

# 🔐 Authentication & Security

Security is an important part of the backend architecture.

## JWT Authentication

ROMAtlas uses:

- Short-lived access tokens
- Long-lived refresh tokens
- HTTP-only refresh-token cookies
- Refresh-token rotation
- Token reuse detection

The default configuration uses:

```text
Access token: 15 minutes
Refresh token: 7 days
```

The short access-token lifetime reduces the impact of an exposed access token.

---

## Refresh Token Rotation

Rather than continuously reusing the same refresh token, ROMAtlas rotates refresh tokens when sessions are refreshed.

The system also detects reuse of an invalidated refresh token.

If token reuse is detected, the associated sessions can be invalidated.

Conceptually:

```text
Refresh Token A
       │
       ▼
     Refresh
       │
       ▼
Refresh Token B
       │
       ▼
Token A becomes invalid
```

This provides additional protection against stolen or replayed refresh tokens.

---

# 🛡️ API Security

The API includes several security layers.

### Helmet

Helmet configures security-related HTTP headers and helps reduce exposure to common browser-based attacks.

### Rate Limiting

`express-rate-limit` limits repeated requests.

This is particularly important for expensive endpoints such as the AI assistant.

### Zod Validation

Incoming requests are validated using Zod schemas.

The validation layer checks things such as:

- Query parameters
- Route parameters
- Request bodies
- Environment variables

Invalid data is rejected before reaching the database layer.

### Request IDs

Requests receive identifiers that can be used when tracing logs and debugging API activity.

### Standard Error Format

API errors follow a consistent structure so the frontend can handle failures predictably.

---

# 📊 Audit Logging

Important user and administrative actions can be recorded through audit logging.

This provides a traceable record of actions performed through the application and is useful for:

- Security investigation
- Administration
- Debugging
- Accountability

---

# 🎨 Frontend

The ROMAtlas frontend is built with React, TypeScript, Vite and Tailwind CSS.

The UI includes:

- Home page
- Real database counts
- Device search
- Device detail pages
- Device information tabs
- ROM list
- ROM detail pages
- Updates feed
- Command/Control-style search shortcut
- Light/dark theme
- Authentication screens
- Bookmarks
- Follow functionality
- Reports
- Notifications

The design intentionally avoids the common generic "AI dashboard" visual language and instead focuses on a clean software-index aesthetic.

---

# 👤 Accounts

Registered users can access account functionality including:

- Sign in
- Registration
- Session restoration
- Following devices
- Following ROMs
- Bookmarking
- Reporting
- Notifications

Session restoration is performed through the refresh-token mechanism rather than requiring the user to repeatedly authenticate.

---

# 🔔 Notifications

Users can follow devices and ROMs.

The notification system is designed to surface relevant changes for followed resources.

For example:

```text
User
 │
 ├── Follows → Device
 │
 └── Follows → ROM
                  │
                  ▼
             New update
                  │
                  ▼
             Notification
```

---

# 🧪 Testing

Testing is part of the project's development workflow.

The backend includes automated tests using **Vitest**.

The project also includes validation and API-level testing around important application behavior.

Common development checks include:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

---

# 🌐 Deployment

ROMAtlas can be deployed as separate frontend and backend services.

```text
┌───────────────────────────────────┐
│ Render Static Site                │
│                                   │
│ React + Vite frontend             │
└─────────────────┬─────────────────┘
                  │
                  │ HTTPS REST API
                  ▼
┌───────────────────────────────────┐
│ Render Web Service                │
│                                   │
│ Node.js + Express API             │
└─────────────────┬─────────────────┘
                  │
                  ▼
┌───────────────────────────────────┐
│ MongoDB Atlas                     │
│                                   │
│ Production database               │
└───────────────────────────────────┘
```

The frontend API endpoint is configured through:

```text
VITE_API_URL
```

The backend uses environment variables for database credentials, JWT secrets, CORS configuration and AI provider configuration.

---

# ⚙️ Local Development

## Prerequisites

Install:

- Node.js
- npm
- Docker Desktop
- Git

---

## Clone the Repository

```bash
git clone https://github.com/SakshamThakur7898/romatlas.git
cd romatlas
```

---

## Install Dependencies

```bash
npm install
```

---

## Start MongoDB

Using Docker Compose:

```bash
docker compose up -d mongo
```

---

## Configure Environment Variables

Copy the example API environment file:

```bash
cp .env.example apps/api/.env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example apps/api/.env
```

Configure the required environment variables before starting the API.

Never commit real credentials, database passwords, API keys or JWT secrets to Git.

---

## Start the API

```bash
npm run dev:api
```

The API runs locally on:

```text
http://localhost:4000
```

Health check:

```text
http://localhost:4000/api/health
```

---

## Start the Web App

In another terminal:

```bash
npm run dev:web
```

The frontend runs on:

```text
http://localhost:5173
```

---

## Seed Development Data

```bash
npm run seed -w apps/api
```

To replace existing seed data:

```bash
npm run seed -w apps/api -- --force
```

---

## Synchronize External Data

Once the API can connect to MongoDB:

```bash
npm run sync -w apps/api -- all
```

---

# 🔄 Development Workflow

A typical development workflow is:

```text
1. Start MongoDB
       ↓
2. Start API
       ↓
3. Start React frontend
       ↓
4. Modify code
       ↓
5. Run type checking
       ↓
6. Run tests
       ↓
7. Build
       ↓
8. Commit
       ↓
9. CI
       ↓
10. Deploy
```

Before pushing changes:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The generated `package-lock.json` should be committed because CI uses:

```bash
npm ci
```

---

# 📌 Current Development Status

ROMAtlas is being developed incrementally.

### Phase 1 — Foundation ✅

- Monorepo
- npm Workspaces
- Express API foundation
- React/Vite frontend shell
- TypeScript
- Zod environment validation
- Helmet
- CORS
- Rate limiting
- Request IDs
- Standard API errors
- Light/dark theme
- CI

### Phase 2 — Database & Data ✅

- Mongoose models
- Database indexes
- Development seed
- External data importers
- Synchronization pipeline
- Structured device data

### Phase 3 — Authentication & API ✅

- User registration
- Authentication
- JWT access tokens
- Refresh tokens
- Refresh-token rotation
- Reuse detection
- Input validation
- Audit logging
- Deterministic AI device resolution
- Grounded AI controller

### Phase 4 — Frontend 🚧

Currently implemented:

- Home page
- Real database counts
- Device search
- Device detail pages
- Eight device detail tabs
- ROM list
- ROM detail
- Updates feed
- Cmd/Ctrl + K search
- Light/dark theme
- Sign in
- Registration
- Session restoration
- Follow
- Bookmark
- Report
- Notifications

Not yet implemented:

- Guide pages
- Admin dashboard

---

# 🛣️ Roadmap

Planned development includes:

- [ ] Guide pages
- [ ] Admin dashboard
- [ ] Expanded device compatibility information
- [ ] More recovery and kernel sources
- [ ] Improved data freshness monitoring
- [ ] More advanced AI retrieval
- [ ] Better source verification
- [ ] Additional automated tests
- [ ] Expanded administrative tooling
- [ ] Improved notification workflows
- [ ] More detailed device relationships
- [ ] Production monitoring and observability

---

# 🧠 Design Philosophy

ROMAtlas is built around several principles.

### Source-first

Important information should point back to its original source.

### Structured data over scattered information

Device compatibility should be represented as structured records wherever possible.

### Deterministic device identification

The system should avoid guessing which device a user means when the identity is ambiguous.

### AI as an interface to verified data

The AI assistant is not intended to replace the database.

Instead:

```text
Database
   ↓
Verified context
   ↓
AI explanation
```

The model acts as a natural-language interface over retrieved information.

### User verification

AI-generated explanations should remain accompanied by underlying records and source links whenever possible.

---

# ⚠️ Disclaimer

ROMAtlas is an independent software project and is not affiliated with:

- Google
- Android
- LineageOS
- TWRP
- OrangeFox
- Xiaomi
- POCO
- OnePlus
- Samsung
- Any other device manufacturer or ROM project referenced by the platform

ROMAtlas indexes publicly available information and links to external sources.

Users should always verify compatibility and instructions from the **original project/device source** before modifying their device.

ROMAtlas does not guarantee that an external resource will remain available, compatible or current.

---

# 🤝 Contributing

Contributions are welcome.

A typical contribution workflow:

```bash
git checkout -b feature/my-feature
```

Make your changes, then run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Commit:

```bash
git add .
git commit -m "Add my feature"
```

Push:

```bash
git push origin feature/my-feature
```

Then open a Pull Request.

---

# 📄 License

See the repository license for the current licensing terms.

---

# 🔗 Project

**ROMAtlas**

A source-linked Android software index built with:

```text
React
TypeScript
Node.js
Express
MongoDB
Mongoose
Tailwind CSS
JWT
Zod
TanStack Query
NVIDIA NIM
```

Built as a full-stack project combining **web development, database engineering, API design, authentication, data synchronization and grounded AI**.
