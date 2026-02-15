# API Reference

## OpenAPI / Swagger

- Swagger UI: `/docs`
- Versioned Swagger UI: `/api/v1/docs`
- OpenAPI JSON: `/openapi.json`
- Contract version response header: `X-API-Version: 1.0`

## Health

- `GET /health`
- Response: `200 { "status": "ok" }`

## Auth

### Register
- `POST /auth/register`
- Body:
```json
{ "name": "John", "email": "john@mail.com", "password": "secret123" }
```

### Login
- `POST /auth/login`
- Body:
```json
{ "email": "john@mail.com", "password": "secret123" }
```

Both return:
```json
{
  "token": "jwt",
  "user": { "id": "...", "name": "John", "email": "john@mail.com" }
}
```

## Tasks (Bearer Token Required)

### List
- `GET /tasks`
- Query (optional): `workspaceId`, `projectId`, `assignedTo`, `status`, `priority`, `search`, `sortBy`, `sortOrder`

### Create
- `POST /tasks`
- Body:
```json
{ "title": "Ship MVP", "workspaceId": "optional_workspace_id", "priority": "high", "status": "todo" }
```

### Update
- `PUT /tasks/:id`
- Body any subset of: `workspaceId`, `projectId`, `title`, `description`, `status`, `priority`, `dueDate`

### Delete
- `DELETE /tasks/:id`
- Response: `204`

## Workspaces (Bearer Token Required)

### List workspaces
- `GET /workspaces`

### Create workspace
- `POST /workspaces`
- Body:
```json
{ "name": "Acme Workspace" }
```

### Invite member by email
- `POST /workspaces/:workspaceId/invites`
- Body:
```json
{ "email": "member@company.com", "role": "member", "expiresInDays": 7 }
```

### Accept invite
- `POST /workspaces/invites/accept`
- Body:
```json
{ "token": "invite_token_here" }
```

### List workspace members
- `GET /workspaces/:workspaceId/members`
