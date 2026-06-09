import test from "node:test";
import assert from "node:assert/strict";
import initSqlJs from "sql.js";

import { createConversationStore } from "../src/conversationStore.mjs";

async function makeStore() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  let saveCount = 0;
  const store = createConversationStore(db, () => {
    saveCount += 1;
  });
  store.initSchema();
  return { store, getSaveCount: () => saveCount };
}

test("createConversation initializes a New App conversation", async () => {
  const { store } = await makeStore();
  const conversation = store.createConversation("conv-1");
  assert.equal(conversation.id, "conv-1");
  assert.equal(conversation.title, "New App");
  assert.equal(store.listConversations()[0].id, "conv-1");
});

test("appendMessage updates title from the first user message", async () => {
  const { store } = await makeStore();
  store.createConversation("conv-1");
  store.appendMessage("conv-1", {
    role: "user",
    content: "做一个家庭服务器状态面板，显示网络、温度、内存和服务状态。",
    build_id: null
  });
  const [conversation] = store.listConversations();
  assert.equal(conversation.title, "做一个家庭服务器状态面板，显示网络、温度、内存和服务状态。");
});

test("listMessages returns messages in creation order", async () => {
  const { store } = await makeStore();
  store.createConversation("conv-1");
  store.appendMessage("conv-1", { role: "user", content: "first" });
  store.appendMessage("conv-1", { role: "assistant", content: "second", build_id: "vb-1" });
  assert.deepEqual(store.listMessages("conv-1").map(message => message.content), ["first", "second"]);
});

test("deleteConversation removes messages too", async () => {
  const { store } = await makeStore();
  store.createConversation("conv-1");
  store.appendMessage("conv-1", { role: "user", content: "first" });
  store.deleteConversation("conv-1");
  assert.deepEqual(store.listConversations(), []);
  assert.deepEqual(store.listMessages("conv-1"), []);
});

test("mutations call saveDb", async () => {
  const { store, getSaveCount } = await makeStore();
  store.createConversation("conv-1");
  store.appendMessage("conv-1", { role: "user", content: "first" });
  store.deleteConversation("conv-1");
  assert.equal(getSaveCount(), 5);
});
