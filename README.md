## 🚀 Bulk Email Sender – SvelteKit Frontend + Hono API Backend

### 📋 Overview

This project is a **Bulk Email Sender** web application with:

- **Backend**: Hono (Node/Bun) REST API
- **Frontend**: SvelteKit TypeScript SPA
- **Database**: SQLite (via `bun:sqlite`)
- **Authentication**: Email/password with Argon2 + session cookies
- **Email**: Nodemailer with SMTP (user-specific SMTP configs)

The original vanilla HTML/JS frontend has been fully migrated to **SvelteKit**, and the Hono app now runs as a pure API server.

---

## 🧱 Architecture

- **Backend (API)** – `src/`
  - `src/app.ts`: Hono app entry, middleware, and route wiring
  - `src/routes/*.ts`: feature routes
    - `auth.ts`: `/auth/*` authentication endpoints
    - `send.ts`: `/send`, batch + scheduling, Excel parsing
    - `report.ts`: `/report*` logs and stats
    - `config.ts`: `/config/smtp*` user SMTP configurations
    - `dashboard.ts`: `/dashboard/*` optimized polling endpoints
  - `src/services/*`: email sending, batch scheduler, logging, user DB etc.
  - `src/types.ts`: shared backend types (contacts, jobs, logs, configs)

- **Frontend (SvelteKit)** – `frontend/`
  - `frontend/src/lib/api.ts`: typed API client wrapper around the Hono endpoints
  - `frontend/src/routes/+layout.svelte`: minimal app shell
  - `frontend/src/routes/+page.svelte`: authenticated dashboard
    - SMTP config selection (using existing `/config/smtp`)
    - Excel upload + subject/body form
    - Optional scheduling
    - Sends via `/send` and displays stats/logs from `/report`
  - `frontend/src/routes/login/+page.svelte`: login/register screen using `/auth/login` and `/auth/register`
  - `frontend/static/samples/sample-contacts.xlsx`: sample Excel contacts file served by SvelteKit at `/samples/sample-contacts.xlsx`

The SvelteKit frontend talks to the backend over HTTP using cookies (no JWTs); the backend is responsible for all business logic and persistence.

---

## ⚙️ Setup & Running

### 1. Install dependencies

From the **project root**:

```bash
# backend deps (Node/Bun environment)
npm install

# frontend deps (SvelteKit app)
cd frontend
npm install
```

> If you prefer Bun for the backend, you can also use `bun install` in the root instead of `npm install`.

### 2. Configure environment

Create a `.env` file in the **project root** (next to `src/app.ts`) with SMTP defaults if desired:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@email
SMTP_PASS=your-password-or-app-password
FROM_EMAIL=your@email
FROM_NAME=Your Name
PORT=3000
```

Users can still create their own SMTP configurations via the UI; global SMTP values act as a fallback.

### 3. Run the backend (Hono API)

From the project root:

```bash
# using Bun (recommended by original project)
bun run src/app.ts

# or with Node (via ts-node or compiled output) if configured in your environment
```

The API will be available at `http://localhost:3000`.

### 4. Run the frontend (SvelteKit)

From the `frontend` folder:

```bash
cd frontend
npm run dev
```

Then open:

- `http://localhost:5173/login` – login / registration (talks to `/auth/*` on port 3000)
- `http://localhost:5173/` – authenticated dashboard (after login)

> Make sure the backend is running on `http://localhost:3000`. If you run it on a different port, set `VITE_API_BASE` in `frontend/.env` (e.g. `VITE_API_BASE="http://localhost:4000"`).

---

## 🔐 Authentication Flow

- **Register** – `POST /auth/register`
  - Frontend: `frontend/src/routes/login/+page.svelte`
  - Creates user, stores hashed password with Argon2, sets `session_token` httpOnly cookie.

- **Login** – `POST /auth/login`
  - Validates credentials, returns user object, sets `session_token` cookie.

- **Me** – `GET /auth/me`
  - Used by SvelteKit pages (`getCurrentUser()` in `lib/api.ts`) to redirect unauthenticated users to `/login`.

- **Logout** – `POST /auth/logout`
  - Clears session server-side and deletes `session_token`.

Most backend routes require an authenticated session; only `/auth/*` and `/health` are public.

---

## ✉️ Email Sending & Scheduling (API Summary)

- **Send / schedule campaign** – `POST /send`
  - Expects `multipart/form-data`:
    - `configId` – selected SMTP configuration ID (from `/config/smtp`)
    - `excelFile` – `.xlsx/.xls` file with contacts
    - `subject` – email subject (supports placeholders like `{{FirstName}}`)
    - `htmlContent` – email body HTML (optional if `htmlTemplate` is provided)
    - `htmlTemplate` – optional HTML file to use as template
    - `delay` – delay between emails in seconds
    - `useBatch`, `batchSize`, `batchDelay`, `emailDelay` – optional batch sending controls
    - `scheduleEmail`, `scheduledTime` (ISO UTC) – for future scheduling
    - `notifyEmail`, `notifyBrowser` – optional completion notifications

- **Parse Excel preview** – `POST /parse-excel`
  - Accepts `excelFile` in `multipart/form-data`
  - Returns a small preview + total count, used for UX.

- **Reports** – `GET /report`
  - Returns:
    - `logs`: per-email logs
    - `stats`: totals (sent, failed, errors)

- **Export logs** – `GET /report/export/csv` and `GET /report/export/json`

- **Clear logs** – `DELETE /report/clear`

- **SMTP configs** – `/config/smtp*`
  - `GET /config/smtp` – list user configs + basic env info
  - `POST /config/smtp` – create config
  - `PUT /config/smtp/:configId` – update config
  - `DELETE /config/smtp/:configId` – delete config
  - `POST /config/smtp/:configId/default` – set default
  - `POST /config/smtp/test` – test SMTP connection

- **Dashboard polling** – `/dashboard/*`
  - `GET /dashboard/poll-status` – lightweight status to decide if polling is needed
  - `GET /dashboard/data` – returns active batch and scheduled jobs when applicable

> The SvelteKit dashboard uses a simplified subset of these features (immediate send + basic scheduling + basic stats) but the API supports more advanced controls that can be surfaced in future UI iterations.

---

## 📦 Useful Paths

- Backend API entry: `src/app.ts`
- Backend routes: `src/routes/*`
- Backend services: `src/services/*`
- Frontend app: `frontend/src`
- Sample Excel: `frontend/static/samples/sample-contacts.xlsx` (served as `/samples/sample-contacts.xlsx`)

This README reflects the **current SvelteKit + Hono architecture** and can be used to run, test, and extend the application locally. No changes are required here for the separate analytical assignment.
