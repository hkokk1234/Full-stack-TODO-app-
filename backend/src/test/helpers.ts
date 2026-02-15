import request from "supertest";
import type { Express } from "express";

type AuthUser = {
  token: string;
  userId: string;
  email: string;
};

let userCounter = 0;

export const loadApp = async (): Promise<Express> => {
  const module = await import("../app");
  return module.default;
};

export const registerUser = async (app: Express, namePrefix = "User"): Promise<AuthUser> => {
  userCounter += 1;
  const email = `user${userCounter}@example.com`;
  const response = await request(app).post("/auth/register").send({
    name: `${namePrefix} ${userCounter}`,
    email,
    password: "Str0ng!Pass"
  });

  if (response.status !== 201) {
    throw new Error(`Register failed (${response.status}): ${JSON.stringify(response.body)}`);
  }

  return {
    token: response.body.accessToken ?? response.body.token,
    userId: response.body.user.id,
    email
  };
};
