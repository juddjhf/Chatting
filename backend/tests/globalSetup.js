import { MongoMemoryReplSet } from "mongodb-memory-server";

export default async function globalSetup(project) {
  const replicaSet = await MongoMemoryReplSet.create({
    binary: { version: "7.0.14", arch: "x64" },
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  project.provide("MONGODB_URI", replicaSet.getUri());
  return async () => {
    await replicaSet.stop();
  };
}
