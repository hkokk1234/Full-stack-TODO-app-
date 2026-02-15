const openApiV1 = {
  openapi: "3.0.3",
  info: {
    title: "TaskFlow API",
    version: "1.0.0",
    description: "TaskFlow REST API (v1 contract)"
  },
  servers: [{ url: "http://localhost:5000" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    },
    schemas: {
      AuthResponse: {
        type: "object",
        properties: {
          accessToken: { type: "string" },
          refreshToken: { type: "string" },
          sessionId: { type: "string" },
          user: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              email: { type: "string" }
            }
          }
        }
      },
      Task: {
        type: "object",
        properties: {
          _id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["todo", "in_progress", "done"] },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          dueDate: { type: "string", format: "date-time", nullable: true },
          progressPercent: { type: "number" }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: { "200": { description: "OK" } }
      }
    },
    "/auth/register": {
      post: {
        summary: "Register with email/password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string" }
                }
              }
            }
          }
        },
        responses: { "201": { description: "Created", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } } }
      }
    },
    "/auth/login": {
      post: {
        summary: "Login with email/password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" }
                }
              }
            }
          }
        },
        responses: { "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } } }
      }
    },
    "/tasks": {
      get: {
        summary: "List visible tasks",
        responses: { "200": { description: "OK" } }
      },
      post: {
        summary: "Create task",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  status: { type: "string", enum: ["todo", "in_progress", "done"] },
                  priority: { type: "string", enum: ["low", "medium", "high"] },
                  dueDate: { type: "string", format: "date-time", nullable: true }
                }
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Created",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } }
          }
        }
      }
    },
    "/tasks/{id}": {
      put: {
        summary: "Update task",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Updated" } }
      },
      delete: {
        summary: "Delete task",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Deleted" } }
      }
    },
    "/tasks/import": {
      post: {
        summary: "Import tasks from CSV/JSON",
        parameters: [{ name: "format", in: "query", required: false, schema: { type: "string", enum: ["csv", "json"] } }],
        requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } } } },
        responses: { "201": { description: "Import completed" } }
      }
    },
    "/tasks/{id}/attachments": {
      post: {
        summary: "Upload task attachment",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } } } },
        responses: { "201": { description: "Attachment uploaded" } }
      }
    },
    "/tasks/{id}/shares": {
      get: {
        summary: "List task shares",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK" } }
      },
      post: {
        summary: "Share task with user",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email" },
                  permission: { type: "string", enum: ["viewer", "editor"] }
                }
              }
            }
          }
        },
        responses: { "200": { description: "Shared" } }
      }
    },
    "/notifications": {
      get: {
        summary: "List notifications",
        responses: { "200": { description: "OK" } }
      }
    },
    "/notifications/preferences": {
      get: {
        summary: "Get notification preferences",
        responses: { "200": { description: "OK" } }
      },
      put: {
        summary: "Update notification preferences",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
        responses: { "200": { description: "Updated" } }
      }
    },
    "/analytics/summary": {
      get: {
        summary: "Analytics dashboard summary",
        responses: { "200": { description: "OK" } }
      }
    },
    "/workspaces": {
      get: {
        summary: "List user workspaces",
        responses: { "200": { description: "OK" } }
      },
      post: {
        summary: "Create workspace",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string" }
                }
              }
            }
          }
        },
        responses: { "201": { description: "Created" } }
      }
    },
    "/workspaces/{workspaceId}/invites": {
      post: {
        summary: "Create workspace invite",
        parameters: [{ name: "workspaceId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email" },
                  role: { type: "string", enum: ["admin", "member", "viewer"] },
                  expiresInDays: { type: "integer", minimum: 1, maximum: 30 }
                }
              }
            }
          }
        },
        responses: { "201": { description: "Invite created" } }
      }
    },
    "/workspaces/invites/accept": {
      post: {
        summary: "Accept workspace invite token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token"],
                properties: {
                  token: { type: "string" }
                }
              }
            }
          }
        },
        responses: { "200": { description: "Invite accepted" } }
      }
    }
  }
};

export default openApiV1;
