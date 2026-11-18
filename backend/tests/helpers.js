import request from "supertest";
import { createApp } from "../src/app.js";

export const app = createApp();

export async function createGroup(overrides = {}) {
  const response = await request(app)
    .post("/api/groups/create")
    .send({
      groupName: overrides.groupName || "Test group",
      password: overrides.password || "private-password-123",
      nickname: overrides.nickname || "Admin",
    })
    .expect(201);
  return {
    response,
    token: response.body.data.token,
    groupCode: response.body.data.groupCode,
    group: response.body.data.group,
    member: response.body.data.member,
  };
}

export async function joinGroup(groupCode, overrides = {}) {
  const response = await request(app)
    .post("/api/groups/join")
    .send({
      groupCode,
      password: overrides.password || "private-password-123",
      nickname: overrides.nickname || "Member",
    })
    .expect(200);
  return {
    response,
    token: response.body.data.token,
    group: response.body.data.group,
    member: response.body.data.member,
  };
}

export function withToken(token) {
  return { Authorization: `Bearer ${token}` };
}
