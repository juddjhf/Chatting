import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, inject } from "vitest";
import Group from "../src/models/Group.js";
import Member from "../src/models/Member.js";
import Message from "../src/models/Message.js";
import Upload from "../src/models/Upload.js";
import { resetOnlineStateForTests } from "../src/services/notificationService.js";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = inject("MONGODB_URI");
process.env.JWT_SECRET = "test-only-secret-that-is-long-enough-and-never-used-outside-tests";
process.env.JWT_EXPIRES_IN = "1h";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.API_PUBLIC_URL = "http://localhost:5000";
process.env.CLOUDINARY_CLOUD_NAME = "";
process.env.CLOUDINARY_API_KEY = "";
process.env.CLOUDINARY_API_SECRET = "";
process.env.MAX_FILE_SIZE_MB = "1";
process.env.RATE_LIMIT_MAX = "1000";
process.env.AUTH_RATE_LIMIT_MAX = "1000";
process.env.UPLOAD_RATE_LIMIT_MAX = "1000";

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await Promise.all([Group.init(), Member.init(), Message.init(), Upload.init()]);
}, 30000);

afterEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
  resetOnlineStateForTests();
});

afterAll(async () => {
  await mongoose.disconnect();
});
