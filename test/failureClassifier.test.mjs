import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyFailure,
  repairPolicyForClassification
} from "../src/failureClassifier.mjs";

test("classifyFailure treats missing deploy evidence as deploy chain failure", () => {
  const classification = classifyFailure({
    verificationReport: {
      failedChecks: [{
        id: "missing-device-evidence",
        label: "device evidence is available",
        evidence: "Run deploy or verify before requesting AI repair."
      }]
    }
  });

  assert.equal(classification.category, "deploy_chain_failure");
  assert.equal(classification.allowCodeRepair, false);
  assert.match(classification.reason, /device evidence/i);
});

test("classifyFailure treats kiosk and microphone evidence gaps as device runtime failure", () => {
  const classification = classifyFailure({
    verificationReport: {
      failedChecks: [
        { id: "kiosk-process-present", label: "kiosk process present", evidence: "chromium process not found" },
        { id: "capability:mic.browser-rms", label: "capability evidence present: mic.browser-rms", evidence: "missing" }
      ]
    },
    goldenLoop: {
      raw: {
        kiosk: "",
        status: "{\"hostname\":\"taishan-black\"}"
      }
    }
  });

  assert.equal(classification.category, "device_runtime_failure");
  assert.equal(classification.allowCodeRepair, false);
  assert.match(classification.reason, /kiosk|microphone/i);
});

test("classifyFailure allows code repair for generated file contract failures", () => {
  const classification = classifyFailure({
    verificationReport: {
      failedChecks: [{
        id: "generated-code-contract",
        label: "generated app.js has required API integrations",
        evidence: "app.js is missing window.VibeBoardHardware"
      }]
    }
  });

  assert.equal(classification.category, "generated_code_failure");
  assert.equal(classification.allowCodeRepair, true);
});

test("repairPolicyForClassification blocks writeback unless failure is generated code", () => {
  assert.deepEqual(repairPolicyForClassification({ category: "deploy_chain_failure" }), {
    allowCodeRepair: false,
    action: "diagnose_deploy_chain"
  });
  assert.deepEqual(repairPolicyForClassification({ category: "device_runtime_failure" }), {
    allowCodeRepair: false,
    action: "diagnose_device_runtime"
  });
  assert.deepEqual(repairPolicyForClassification({ category: "generated_code_failure" }), {
    allowCodeRepair: true,
    action: "repair_generated_code"
  });
});
