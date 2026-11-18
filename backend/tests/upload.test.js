import request from "supertest";
import { describe, expect, it } from "vitest";
import { validateUploadedFile } from "../src/validators/uploadValidator.js";
import { app, createGroup, withToken } from "./helpers.js";

const validPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l3sAAAAASUVORK5CYII=",
  "base64",
);

describe("file upload security", () => {
  it("verifies actual file signatures instead of trusting only the name and MIME header", async () => {
    const file = await validateUploadedFile({
      originalname: "tiny.png",
      mimetype: "image/png",
      size: validPng.length,
      buffer: validPng,
    });
    expect(file).toMatchObject({ messageType: "image", resourceType: "image", extension: ".png" });
    await expect(validateUploadedFile({
      originalname: "spoofed.png",
      mimetype: "image/png",
      size: 12,
      buffer: Buffer.from("not an image"),
    })).rejects.toMatchObject({ statusCode: 415 });
  });

  it("requires authentication and rejects unsupported extensions before storage", async () => {
    const { token, groupCode } = await createGroup();
    const executable = Buffer.from("MZ executable");
    await request(app)
      .post("/api/upload")
      .field("groupCode", groupCode)
      .attach("file", executable, { filename: "payload.exe", contentType: "application/octet-stream" })
      .expect(401);
    await request(app)
      .post("/api/upload")
      .set(withToken(token))
      .field("groupCode", groupCode)
      .attach("file", executable, { filename: "payload.exe", contentType: "application/octet-stream" })
      .expect(415);
  });

  it("rejects an oversized multipart upload", async () => {
    const { token, groupCode } = await createGroup();
    const oversizedText = Buffer.alloc(1024 * 1024 + 1, "a");
    await request(app)
      .post("/api/upload")
      .set(withToken(token))
      .field("groupCode", groupCode)
      .attach("file", oversizedText, { filename: "large.txt", contentType: "text/plain" })
      .expect(413);
  });
});
