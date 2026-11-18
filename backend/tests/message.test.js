import request from "supertest";
import { describe, expect, it } from "vitest";
import Message from "../src/models/Message.js";
import { app, createGroup, joinGroup, withToken } from "./helpers.js";

describe("group messages", () => {
  it("persists messages, returns chronological history, and supports pagination", async () => {
    const admin = await createGroup();
    const ids = [];
    for (let index = 0; index < 3; index += 1) {
      const response = await request(app)
        .post("/api/messages")
        .set(withToken(admin.token))
        .send({ groupCode: admin.groupCode, messageType: "text", text: `message ${index}` })
        .expect(201);
      ids.push(response.body.data.message._id);
    }

    const newestPage = await request(app)
      .get(`/api/messages/${admin.groupCode}`)
      .query({ limit: 2 })
      .set(withToken(admin.token))
      .expect(200);
    expect(newestPage.body.data.messages.map((message) => message.text)).toEqual(["message 1", "message 2"]);
    expect(newestPage.body.data.hasMore).toBe(true);

    const olderPage = await request(app)
      .get("/api/messages")
      .query({ limit: 2, cursor: newestPage.body.data.nextCursor })
      .set(withToken(admin.token))
      .expect(200);
    expect(olderPage.body.data.messages.map((message) => message.text)).toEqual(["message 0"]);
    expect(await Message.countDocuments()).toBe(ids.length);
  });

  it("is idempotent for a retried message request and broadcasts only after persistence", async () => {
    const admin = await createGroup();
    const clientMessageId = "4074c6a9-35df-48f4-a861-a65b9825c095";
    const payload = { groupCode: admin.groupCode, messageType: "text", text: "once", clientMessageId };

    const first = await request(app).post("/api/messages").set(withToken(admin.token)).send(payload).expect(201);
    const second = await request(app).post("/api/messages").set(withToken(admin.token)).send(payload).expect(201);
    expect(second.body.data.message._id).toBe(first.body.data.message._id);
    expect(await Message.countDocuments()).toBe(1);
  });

  it("supports replies and prevents cross-group replies or message reads", async () => {
    const firstGroup = await createGroup({ groupName: "First" });
    const secondGroup = await createGroup({ groupName: "Second" });
    const message = await request(app)
      .post("/api/messages")
      .set(withToken(firstGroup.token))
      .send({ messageType: "text", text: "Original" })
      .expect(201);

    const reply = await request(app)
      .post(`/api/messages/${message.body.data.message._id}/reply`)
      .set(withToken(firstGroup.token))
      .send({ text: "Reply" })
      .expect(201);
    expect(reply.body.data.message.replyTo.text).toBe("Original");
    await request(app)
      .get(`/api/messages/${firstGroup.groupCode}`)
      .set(withToken(secondGroup.token))
      .expect(404);
  });

  it("allows authors to delete their messages and admins to delete any group message", async () => {
    const admin = await createGroup();
    const member = await joinGroup(admin.groupCode);
    const message = await request(app)
      .post("/api/messages")
      .set(withToken(member.token))
      .send({ messageType: "text", text: "Remove this" })
      .expect(201);
    const messageId = message.body.data.message._id;

    await request(app).delete(`/api/messages/${messageId}`).set(withToken(admin.token)).expect(200);
    const history = await request(app).get("/api/messages").set(withToken(member.token)).expect(200);
    expect(history.body.data.messages[0]).toMatchObject({ isDeleted: true, text: "" });
  });

  it("rejects messages from unauthenticated users and mismatched group codes", async () => {
    const admin = await createGroup();
    await request(app).post("/api/messages").send({ text: "No token" }).expect(401);
    await request(app)
      .post("/api/messages")
      .set(withToken(admin.token))
      .send({ groupCode: "AAAAAAAAAA", text: "Wrong group", messageType: "text" })
      .expect(404);
  });
});
