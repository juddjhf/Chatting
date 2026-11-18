import bcrypt from "bcryptjs";
import request from "supertest";
import { describe, expect, it } from "vitest";
import Group from "../src/models/Group.js";
import { app, createGroup, withToken } from "./helpers.js";

describe("group authentication", () => {
  it("creates a private group with a hashed password and an admin session", async () => {
    const { response, token, groupCode, group, member } = await createGroup({
      groupName: "Weekend crew",
      nickname: "Ari",
    });

    expect(groupCode).toMatch(/^[A-F0-9]{10}$/);
    expect(group).toMatchObject({ name: "Weekend crew", groupCode });
    expect(group.creator).toMatchObject({ memberId: member.memberId, role: "admin" });
    expect(token).toEqual(expect.any(String));
    expect(response.body.data).not.toHaveProperty("passwordHash");

    const stored = await Group.findOne({ groupCode }).select("+passwordHash");
    expect(stored.passwordHash).not.toBe("private-password-123");
    expect(await bcrypt.compare("private-password-123", stored.passwordHash)).toBe(true);
  });

  it("does not reveal whether a group code or password was incorrect", async () => {
    const { groupCode } = await createGroup();
    const wrongPassword = await request(app)
      .post("/api/groups/join")
      .send({ groupCode, password: "wrong-password-123" })
      .expect(401);
    const missingGroup = await request(app)
      .post("/api/groups/join")
      .send({ groupCode: "AAAAAAAAAA", password: "wrong-password-123" })
      .expect(401);

    expect(wrongPassword.body.message).toBe(missingGroup.body.message);
    expect(wrongPassword.body.message).toMatch(/invalid group code or password/i);
  });

  it("rejects malformed input and a tampered bearer token", async () => {
    await request(app).post("/api/groups/create").send({ groupName: "x", password: "short" }).expect(400);
    const { token } = await createGroup();
    await request(app).get("/api/groups/me").set(withToken(`${token.slice(0, -1)}x`)).expect(401);
  });

  it("revokes the current membership token on logout", async () => {
    const { token } = await createGroup();
    await request(app).post("/api/auth/logout").set(withToken(token)).expect(200);
    await request(app).get("/api/groups/me").set(withToken(token)).expect(401);
  });

  it("creates distinct, unique group codes", async () => {
    const first = await createGroup({ groupName: "First" });
    const second = await createGroup({ groupName: "Second" });
    expect(first.groupCode).not.toBe(second.groupCode);
    expect(await Group.countDocuments()).toBe(2);
  });
});
