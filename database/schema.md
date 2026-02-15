# MongoDB Schema

## users

```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (unique)",
  "passwordHash": "string",
  "createdAt": "Date"
}
```

## tasks

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref users)",
  "title": "string",
  "description": "string",
  "status": "todo | in_progress | done",
  "priority": "low | medium | high",
  "dueDate": "Date | null",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## Indexes

- `users.email` unique
- `tasks.userId`
- `tasks.status`
- `tasks.priority`
- `tasks.userId + createdAt`
