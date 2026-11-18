import request from "supertest";
import { describe, expect, it } from "vitest";
import Group from "../src/models/Group.js";
import Member from "../src/models/Member.js";
import { app, createGroup, joinGroup, withToken } from "./helpers.js";

describe("group membership and administration", () => {
  it("returns private group details and members only to authenticated members", async () => {
    const admin = await createGroup();
    const joined = await joinGroup(admin.groupCode);

    const details = await request(app)
      .get(`/api/groups/${admin.groupCode.toLowerCase()}`)
      .set(withToken(joined.token))
      .expect(200);
    const members = await request(app)
      .get(`/api/groups/${admin.groupCode}/members`)
      .set(withToken(joined.token))
      .expect(200);

    expect(details.body.data.groupCode).toBe(admin.groupCode);
    expect(members.body.data.members).toHaveLength(2);
    await request(app).get(`/api/groups/${admin.groupCode}`).expect(401);
    await request(app).get("/api/groups/AAAAAAAAAA").set(withToken(joined.token)).expect(404);
  });

  it("allows a member to leave and revokes that membership", async () => {
    const admin = await createGroup();
    const member = await joinGroup(admin.groupCode);

    await request(app)
      .post(`/api/groups/${admin.groupCode}/leave`)
      .set(withToken(member.token))
      .expect(200);
    await request(app).get("/api/groups/me").set(withToken(member.token)).expect(401);
    expect(await Member.countDocuments({ groupId: admin.group._id, isActive: true })).toBe(1);
    expect(await Group.countDocuments({ groupCode: admin.groupCode, isActive: true })).toBe(1);
  });

  it("lets only the group admin remove members and immediately revokes their session", async () => {
    const admin = await createGroup();
    const member = await joinGroup(admin.groupCode);
    const anotherMember = await joinGroup(admin.groupCode, { nickname: "Another" });

    await request(app)
      .delete(`/api/groups/${admin.groupCode}/members/${anotherMember.member.memberId}`)
      .set(withToken(member.token))
      .expect(403);
    await request(app)
      .delete(`/api/groups/${admin.groupCode}/members/${member.member.memberId}`)
      .set(withToken(admin.token))
      .expect(200);
    await request(app).get("/api/groups/me").set(withToken(member.token)).expect(401);
  });

  it("deletes a group and revokes every active member session", async () => {
    const admin = await createGroup();
    const member = await joinGroup(admin.groupCode);

    await request(app).delete("/api/groups").set(withToken(member.token)).expect(403);
    await request(app).delete("/api/groups").set(withToken(admin.token)).expect(200);
    await request(app).get("/api/groups/me").set(withToken(admin.token)).expect(401);
    await request(app).get("/api/groups/me").set(withToken(member.token)).expect(401);
    expect(await Group.countDocuments({ groupCode: admin.groupCode, isActive: true })).toBe(0);
  });
});
