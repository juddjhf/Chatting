import { createServer } from "node:http";
import { io as createClient } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { createSocketServer } from "../src/config/socket.js";
import Message from "../src/models/Message.js";
import { app, createGroup, joinGroup } from "./helpers.js";

let server;
let io;
let clients = [];

async function startSocketServer() {
  server = createServer(app);
  io = createSocketServer(server);
  app.set("io", io);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

async function connectClient(url, token) {
  const client = createClient(url, {
    auth: { token },
    transports: ["websocket"],
    reconnection: false,
  });
  clients.push(client);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Socket connection timed out.")), 5000);
    client.once("connect", () => {
      clearTimeout(timer);
      resolve();
    });
    client.once("connect_error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  return client;
}

function emitWithAck(client, event, payload) {
  return new Promise((resolve) => client.emit(event, payload, resolve));
}

function nextEvent(client, event) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${event}.`)), 5000);
    client.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function stopSocketServer() {
  clients.forEach((client) => client.disconnect());
  clients = [];
  if (io) await new Promise((resolve) => io.close(resolve));
  io = null;
  server = null;
}

afterEach(async () => {
  await stopSocketServer();
});

describe("authenticated Socket.IO groups", () => {
  it("authenticates, joins only its authorized room, and persists acknowledged messages", async () => {
    const group = await createGroup();
    const url = await startSocketServer();
    const client = await connectClient(url, group.token);

    const joined = await emitWithAck(client, "join_group", { groupCode: group.groupCode });
    expect(joined).toMatchObject({ success: true, data: { groupCode: group.groupCode } });

    const incoming = nextEvent(client, "new_message");
    const sent = await emitWithAck(client, "send_message", {
      groupCode: group.groupCode,
      messageType: "text",
      text: "Socket persisted message",
    });
    const broadcast = await incoming;

    expect(sent).toMatchObject({ success: true, data: { message: { text: "Socket persisted message" } } });
    expect(broadcast._id).toBe(sent.data.message._id);
    expect(await Message.countDocuments({ groupId: group.group._id })).toBe(1);
  });

  it("rejects joining another group and isolates broadcasts between private rooms", async () => {
    const first = await createGroup({ groupName: "Room one" });
    const second = await createGroup({ groupName: "Room two" });
    const url = await startSocketServer();
    const firstClient = await connectClient(url, first.token);
    const secondClient = await connectClient(url, second.token);

    const denied = await emitWithAck(firstClient, "join_group", { groupCode: second.groupCode });
    expect(denied.success).toBe(false);
    expect((await emitWithAck(secondClient, "join_group", { groupCode: second.groupCode })).success).toBe(true);
    expect((await emitWithAck(firstClient, "join_group", { groupCode: first.groupCode })).success).toBe(true);

    let receivedCrossGroupMessage = false;
    secondClient.on("new_message", () => {
      receivedCrossGroupMessage = true;
    });
    const incoming = nextEvent(firstClient, "new_message");
    const sent = await emitWithAck(firstClient, "send_message", {
      groupCode: first.groupCode,
      messageType: "text",
      text: "Only room one",
    });
    await incoming;
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(sent.success).toBe(true);
    expect(receivedCrossGroupMessage).toBe(false);
  });

  it("relays typing status only to other members of the joined group", async () => {
    const admin = await createGroup();
    const member = await joinGroup(admin.groupCode);
    const url = await startSocketServer();
    const adminClient = await connectClient(url, admin.token);
    const memberClient = await connectClient(url, member.token);

    await emitWithAck(adminClient, "join_group", { groupCode: admin.groupCode });
    await emitWithAck(memberClient, "join_group", { groupCode: admin.groupCode });
    const typing = nextEvent(memberClient, "user_typing");
    adminClient.emit("typing_start", { groupCode: admin.groupCode });
    expect(await typing).toMatchObject({ memberId: admin.member.memberId, nickname: "Admin" });
  });
});
