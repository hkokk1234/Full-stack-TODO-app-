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

### 1) Clone

```bash
git clone https://github.com/hkokk1234/Full-stack-TODO-app-.git
cd Full-stack-TODO-app-
```

### 2) Install dependencies

```bash
npm --prefix backend install
npm --prefix frontend install
```

### 3) Configure environment

Create `backend/.env` from `backend/.env.example` and set at least:

- `MONGO_URI`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `FRONTEND_ORIGIN`

Optional (if using OAuth/email/AI):

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- SMTP settings
- `OPENAI_API_KEY`

### 4) Run development servers

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

### 5) Quality checks

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

![Screenshot 1](https://github.com/user-attachments/assets/3dc241d1-5107-4ac9-9dc5-e78fd4f23fe9)

![Screenshot 2](https://github.com/user-attachments/assets/333cf297-0114-44e5-ac0f-fdacb6ce22a6)

![Screenshot 3](https://github.com/user-attachments/assets/a3611780-2347-4262-bd7d-77a6607f0122)

![Screenshot 4](https://github.com/user-attachments/assets/d2effe33-b895-47f5-9514-547ca306e2fe)

![Screenshot 5](https://github.com/user-attachments/assets/28a7cb3f-ad17-47b7-81a6-fc37635d3d9b)

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

## Security and API Keys

- Never commit real secrets (`.env`, API keys, OAuth secrets).
- Use `backend/.env.example` as a template only, with placeholders.
- Rotate any key that was ever shared publicly or committed by mistake.
- Use environment secrets in CI/CD (e.g. GitHub Environments/Secrets).

Make sure `.gitignore` includes:# TaskFlow - Full-Stack Collaborative Todo Platform

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

### 1) Clone

```bash
git clone https://github.com/hkokk1234/Full-stack-TODO-app-.git
cd Full-stack-TODO-app-
```

### 2) Install dependencies

```bash
npm --prefix backend install
npm --prefix frontend install
```

### 3) Configure environment

Create `backend/.env` from `backend/.env.example` and set at least:

- `MONGO_URI`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `FRONTEND_ORIGIN`

Optional (if using OAuth/email/AI):

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- SMTP settings
- `OPENAI_API_KEY`

### 4) Run development servers

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

### 5) Quality checks

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

![Screenshot 1](https://github.com/user-attachments/assets/3dc241d1-5107-4ac9-9dc5-e78fd4f23fe9)

![Screenshot 2](https://github.com/user-attachments/assets/333cf297-0114-44e5-ac0f-fdacb6ce22a6)

![Screenshot 3](https://github.com/user-attachments/assets/a3611780-2347-4262-bd7d-77a6607f0122)

![Screenshot 4](https://github.com/user-attachments/assets/d2effe33-b895-47f5-9514-547ca306e2fe)

![Screenshot 5](https://github.com/user-attachments/assets/28a7cb3f-ad17-47b7-81a6-fc37635d3d9b)

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

## Security and API Keys

- Never commit real secrets (`.env`, API keys, OAuth secrets).
- Use `backend/.env.example` as a template only, with placeholders.
- Rotate any key that was ever shared publicly or committed by mistake.
- Use environment secrets in CI/CD (e.g. GitHub Environments/Secrets).

Make sure `.gitignore` includes:


## License

This project is licensed under the MIT License - see the `LICENSE` file.

## Notes

- Do not commit secrets (`.env` must stay local).
- See `docs/DEPLOYMENT.md` for CI/CD, staging/production strategy, and secrets management.
