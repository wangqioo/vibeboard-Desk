import test from "node:test";
import assert from "node:assert/strict";

import {
  chatCompletionsUrl,
  MODEL_PROVIDERS,
  normalizeModelSettings
} from "../src/modelSettings.mjs";

test("normalizeModelSettings defaults to DeepSeek and is disabled without an API key", () => {
  const settings = normalizeModelSettings({});
  assert.equal(settings.provider, "deepseek");
  assert.equal(settings.providerLabel, "DeepSeek");
  assert.equal(settings.baseUrl, "https://api.deepseek.com");
  assert.equal(settings.model, "deepseek-v4-flash");
  assert.equal(settings.enabled, false);
});

test("normalizeModelSettings supports the MiniMax preset", () => {
  const settings = normalizeModelSettings({ provider: "minimax", apiKey: "sk-test" });
  assert.equal(settings.provider, "minimax");
  assert.equal(settings.providerLabel, "MiniMax");
  assert.equal(settings.baseUrl, "https://api.minimaxi.com/v1");
  assert.equal(settings.model, "MiniMax-M2.7");
  assert.equal(settings.enabled, true);
});

test("normalizeModelSettings supports custom OpenAI-compatible providers", () => {
  const settings = normalizeModelSettings({
    provider: "custom",
    baseUrl: "https://llm.example/v1///",
    model: "my-model",
    apiKey: "sk-custom"
  });
  assert.equal(settings.provider, "custom");
  assert.equal(settings.baseUrl, "https://llm.example/v1");
  assert.equal(settings.model, "my-model");
  assert.equal(settings.enabled, true);
});

test("unknown providers use custom settings shape", () => {
  const settings = normalizeModelSettings({
    provider: "unknown",
    baseUrl: "https://llm.example",
    model: "model",
    apiKey: "key"
  });
  assert.equal(settings.provider, "unknown");
  assert.equal(settings.providerLabel, "Custom");
  assert.equal(settings.enabled, true);
});

test("chatCompletionsUrl appends the path once", () => {
  assert.equal(chatCompletionsUrl("https://api.example/v1"), "https://api.example/v1/chat/completions");
  assert.equal(chatCompletionsUrl("https://api.example/v1/chat/completions"), "https://api.example/v1/chat/completions");
});

test("MODEL_PROVIDERS exposes current presets", () => {
  assert.deepEqual(Object.keys(MODEL_PROVIDERS), ["deepseek", "minimax", "custom"]);
});
