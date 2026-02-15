<<<<<<< HEAD
# TaskFlow - Full-Stack Collaborative Todo Platform

TaskFlow is a production-style full-stack task management application with authentication, collaboration, workspace scoping, analytics, notifications, attachments, import/export, and API documentation.

## What This Project Includes

- User auth (register/login, refresh sessions, passkeys, Google OAuth)
- Task CRUD with status, priority, due dates, recurrence, subtasks, and linked resources
- Workspace + invite flow with role-based access
- Project/team collaboration (comments, activity feed, assignments, sharing ACL)
- Notifications (in-app + reminder pipeline)
- Analytics dashboard
- Attachments upload
- Import/export (CSV + JSON, compat mapping)
- Real-time updates (Socket.io)
- OpenAPI/Swagger docs
- Test coverage (unit/integration/e2e)

## Tech Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: MongoDB + Mongoose
- Realtime: Socket.io
- Validation: Zod
- Testing: Vitest + Supertest + mongodb-memory-server

## Architecture

- `frontend/`: SPA UI, route-based pages, API client, dashboard views
- `backend/`: REST API, auth, business logic, validation, services
- `database/`: schema docs and migrations
- `docs/`: API and deployment documentation

Main backend modules:
- `controllers/` request handling
- `routes/` endpoint mapping
- `models/` MongoDB schemas
- `services/` business/domain logic
- `validators/` request validation
- `middleware/` auth + error handling

## Roles and Permissions

Workspace roles:
- `owner`: full access, member management, invite creation
- `admin`: member management, invite creation
- `member`: can work on workspace tasks
- `viewer`: read-oriented access

Project roles:
- `owner`, `admin`, `member`, `viewer` with project-level read/write permissions

Task sharing (personal tasks):
- `viewer`: can view
- `editor`: can update

Access control is enforced in backend controllers and services for task visibility and mutations.

## Download and Run

## 1) Clone

```bash
git clone <YOUR_REPO_URL>
cd PROJECT1
```

## 2) Install dependencies

```bash
npm --prefix backend install
npm --prefix frontend install
```

## 3) Configure environment

Create `backend/.env` from `backend/.env.example` and set at least:

- `MONGO_URI`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `FRONTEND_ORIGIN`

Optional (if using OAuth/email/AI):

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- SMTP settings
- `OPENAI_API_KEY`

## 4) Run development servers

Terminal 1:
```bash
npm run dev:backend
```

Terminal 2:
```bash
npm run dev:frontend
```

App URLs:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## 5) Quality checks

```bash
npm run typecheck
npm run test
npm run build
```

## API Docs

- Swagger UI: `http://localhost:5000/docs`
- Versioned Swagger UI: `http://localhost:5000/api/v1/docs`
- OpenAPI JSON: `http://localhost:5000/openapi.json`
- Contract response header: `X-API-Version: 1.0`

## Screenshots

Add your screenshots in `docs/screenshots/` with the filenames below (or update the paths).

### Login
![Login](docs/screenshots/login.png)

### Tasks Board
![Tasks Board](docs/screenshots/tasks-board.png)

### Workspaces
![Workspaces](docs/screenshots/workspaces.png)

### Analytics Dashboard
![Analytics Dashboard](docs/screenshots/analytics.png)

## Docker (optional)

```bash
npm run docker:up
npm run docker:logs
npm run docker:down
```

## Migrations

```bash
npm --prefix backend run migrate:create -- your_migration_name
npm --prefix backend run migrate:up
npm --prefix backend run migrate:down
```

## Notes

- Do not commit secrets (`.env` must stay local).
- See `docs/DEPLOYMENT.md` for CI/CD, staging/production strategy, and secrets management.
=======
# Full-stack-TODO-app-



## TODO App (MongoDB + TypeScript)
## TaskFlow - Full-Stack Collaborative Todo Platform
 
-Full-stack TODO app with React frontend and Node.js/Express backend using MongoDB.
+TaskFlow is a production-style full-stack task management application with authentication, collaboration, workspace scoping, analytics, notifications, attachments, import/export, and API documentation.
 
## Features
## What This Project Includes

User auth (register/login, refresh sessions, passkeys, Google OAuth)
Task CRUD with status, priority, due dates, recurrence, subtasks, and linked resources
Workspace + invite flow with role-based access
Project/team collaboration (comments, activity feed, assignments, sharing ACL)
Notifications (in-app + reminder pipeline)
Analytics dashboard
Attachments upload
Import/export (CSV + JSON, compat mapping)
Real-time updates (Socket.io)
OpenAPI/Swagger docs
Test coverage (unit/integration/e2e)
 
-- JWT auth + Google OAuth
-- Refresh-token sessions, device list, revoke other devices
-- Task CRUD with status, priority, due date, linked resource
-- Collaboration foundation: projects/roles, comments, activity feed, assignments
-- Search + sorting + server-side pagination
-- Due-date reminders (`OVERDUE`, `TODAY`) in UI
-- Realtime updates via Socket.io
-- OpenAPI/Swagger docs (`/docs`, `/api/v1/docs`)
-- Docker setup for `mongo + backend + frontend`
## Tech Stack
## Screenshots
![photo1](https://github.com/user-attachments/assets/3dc241d1-5107-4ac9-9dc5-e78fd4f23fe9)

![photo2](https://github.com/user-attachments/assets/333cf297-0114-44e5-ac0f-fdacb6ce22a6)

![photo3](https://github.com/user-attachments/assets/a3611780-2347-4262-bd7d-77a6607f0122)

![photo4](https://github.com/user-attachments/assets/d2effe33-b895-47f5-9514-547ca306e2fe)

![photo5](https://github.com/user-attachments/assets/28a7cb3f-ad17-47b7-81a6-fc37635d3d9b) 
## Local Dev
+- Frontend: React + TypeScript + Vite
+- Backend: Node.js + Express + TypeScript
+- Database: MongoDB + Mongoose
+- Realtime: Socket.io
+- Validation: Zod
+- Testing: Vitest + Supertest + mongodb-memory-server
 
### 1) Backend
## Architecture
+
+- `frontend/`: SPA UI, route-based pages, API client, dashboard views
+- `backend/`: REST API, auth, business logic, validation, services
+- `database/`: schema docs and migrations
+- `docs/`: API and deployment documentation
+
+Main backend modules:
+- `controllers/` request handling
+- `routes/` endpoint mapping
+- `models/` MongoDB schemas
+- `services/` business/domain logic
+- `validators/` request validation
+- `middleware/` auth + error handling
+
## Roles and Permissions
+
+Workspace roles:
+- `owner`: full access, member management, invite creation
+- `admin`: member management, invite creation
+- `member`: can work on workspace tasks
+- `viewer`: read-oriented access
+
Project roles:
 `owner`, `admin`, `member`, `viewer` with project-level read/write permissions

Task sharing (personal tasks):
 `viewer`: can view
 `editor`: can update

+Access control is enforced in backend controllers and services for task visibility and mutations.
+
## Download and Run
+
## 1) Clone
 
 ```bash
-cd backend
-cp .env.example .env
-npm install
-npm run dev
+git clone <YOUR_REPO_URL>
+cd PROJECT1
 ```
 
-### 2) Frontend
+## 2) Install dependencies
 
 ```bash
-cd frontend
-cp .env.example .env
-npm install
-npm run dev
+npm --prefix backend install
+npm --prefix frontend install
 ```
 
-Frontend: `http://localhost:5173`  
-Backend: `http://localhost:5000`
## 3) Configure environment
 
## Required backend env
+Create `backend/.env` from `backend/.env.example` and set at least:
 
@@ -43,20 +81,28 @@
 - `JWT_SECRET`
-- `JWT_EXPIRES_IN=15m`
 - `REFRESH_TOKEN_SECRET`
-- `REFRESH_TOKEN_EXPIRES_IN=30d`
 - `FRONTEND_ORIGIN`
-- `OAUTH_FRONTEND_CALLBACK_URL`
-- `GOOGLE_CLIENT_ID`
-- `GOOGLE_CLIENT_SECRET`
-- `GOOGLE_REDIRECT_URI=http://localhost:5000/auth/oauth/google/callback`
 
## Docker
+Optional (if using OAuth/email/AI):
+
+- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
+- SMTP settings
+- `OPENAI_API_KEY`
+
## 4) Run development servers
 
+Terminal 1:
 ```bash
-npm run docker:up
-npm run docker:down
-npm run docker:logs
+npm run dev:backend
 ```
 
## Quality
Terminal 2:
bash
npm run dev:frontend

App URLs:
Frontend: `http://localhost:5173`
Backend: `http://localhost:5000`

## 5) Quality checks

-Backend test scopes:
-- `npm --prefix backend run test:unit`
-- `npm --prefix backend run test:integration`
-- `npm --prefix backend run test:e2e`
 
-## API Docs & Versioning
+## API Docs
 
@@ -78,4 +119,12 @@
 - OpenAPI JSON: `http://localhost:5000/openapi.json`
-- Contract header on responses: `X-API-Version: 1.0`
+- Contract response header: `X-API-Version: 1.0`
 
## Docker (optional)

bash
+npm run docker:up
+npm run docker:logs
+npm run docker:down
+```
+
 ## Migrations
1) Rights for Use (License)
Create a LICENSE file (recommended: MIT) so people know they can use your code.

Example (MIT):

MIT License

Copyright (c) 2026 <YOUR_NAME>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND...
Add in README:

## License
This project is licensed under the MIT License - see the `LICENSE` file.
2) Keys / Secrets Policy
Add in README:

## Security and API Keys
- Never commit real secrets (`.env`, API keys, OAuth secrets).
- Use `backend/.env.example` as template only.
- Rotate any key that was ever shared publicly.
- Use environment secrets in CI/CD (GitHub Environments/Secrets).
3) Protect Your Repo
Ensure .gitignore includes:
backend/.env
frontend/.env
*.pem
*.key
Keep only placeholders in .env.example:
GOOGLE_CLIENT_SECRET=YOUR_SECRET_HERE
OPENAI_API_KEY=YOUR_KEY_HERE
4) Important
If you pasted real keys in chat/screenshots/repo history, rotate them now (Google/OpenAI/etc).
Old keys should be treated as compromised.


-See `docs/DEPLOYMENT.md` for CI/CD, secrets management, staging/prod workflow, and release strategy.
## Notes
+
+- Do not commit secrets (`.env` must stay local).
+- See `docs/DEPLOYMENT.md` for CI/CD, staging/production strategy, and secrets management.
>>>>>>> 93e7e8e2127782dae4099b7344a35125914a2804
