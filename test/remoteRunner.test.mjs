import test from "node:test";
import assert from "node:assert/strict";

import {
  buildOpenSshArgs,
  buildPasswordSshPayload,
  buildUploadBundleCommand,
  buildUploadBundlePayload,
  buildUploadTextCommand,
  buildUploadTextPayload,
  buildWslSshArgs,
  execPasswordSsh,
  execOpenSsh,
  execWslSsh,
  orderedEndpoints,
  runAcrossEndpoints,
  summarizeRemoteError
} from "../src/remoteRunner.mjs";

test("orderedEndpoints prefers active endpoint and deduplicates the rest", () => {
  const active = { name: "frp", host: "150.158.146.192", port: 6223 };
  const endpoints = [
    { name: "frp", host: "150.158.146.192", port: 6223 },
    { name: "configured", host: "192.168.1.31", port: 22 }
  ];
  assert.deepEqual(orderedEndpoints(active, endpoints), [
    { name: "frp", host: "150.158.146.192", port: 6223 },
    { name: "configured", host: "192.168.1.31", port: 22 }
  ]);
});

test("orderedEndpoints handles no active endpoint", () => {
  assert.deepEqual(orderedEndpoints(null, [
    { name: "frp", host: "150.158.146.192", port: 6223 }
  ]), [
    { name: "frp", host: "150.158.146.192", port: 6223 }
  ]);
});

test("summarizeRemoteError extracts the most useful SSH failure line", () => {
  const error = new Error("Command failed");
  error.stderr = "debug line\nPermission denied (publickey,password).\n";
  error.stdout = "";
  assert.equal(summarizeRemoteError(error), "Permission denied (publickey,password).");
});

test("summarizeRemoteError falls back to the final available line", () => {
  const error = new Error("outer error");
  error.stderr = "first\nlast";
  assert.equal(summarizeRemoteError(error), "outer error");
});

test("summarizeRemoteError has a stable fallback", () => {
  assert.equal(summarizeRemoteError(null), "remote command failed");
});

test("buildOpenSshArgs preserves the existing key-auth ssh options", () => {
  const args = buildOpenSshArgs({
    endpoint: { host: "150.158.146.192", port: 6223 },
    user: "linaro",
    identityFile: "/tmp/id_ed25519",
    knownHosts: "/tmp/known_hosts",
    remoteCommand: "hostname"
  });

  assert.deepEqual(args, [
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=20",
    "-i", "/tmp/id_ed25519",
    "-o", "IdentitiesOnly=yes",
    "-o", "StrictHostKeyChecking=accept-new",
    "-o", "UserKnownHostsFile=/tmp/known_hosts",
    "-p", "6223",
    "linaro@150.158.146.192",
    "hostname"
  ]);
});

test("execOpenSsh runs ssh with built args and writes stdin input", async () => {
  let observed = {};
  const result = await execOpenSsh({
    execFile: (command, args, options, callback) => {
      observed = { command, args, options, input: "" };
      return {
        stdin: {
          end: input => {
            observed.input = input;
            callback(null, "stdout text", "stderr text");
          }
        }
      };
    },
    endpoint: { host: "150.158.146.192", port: 6223 },
    user: "linaro",
    identityFile: "/tmp/id_ed25519",
    knownHosts: "/tmp/known_hosts",
    remoteCommand: "cat",
    timeout: 1234,
    input: "payload",
    cwd: "/work"
  });

  assert.equal(observed.command, "ssh");
  assert.deepEqual(observed.args.slice(-3), ["6223", "linaro@150.158.146.192", "cat"]);
  assert.equal(observed.options.cwd, "/work");
  assert.equal(observed.options.timeout, 1234);
  assert.equal(observed.options.windowsHide, true);
  assert.equal(observed.input, "payload");
  assert.deepEqual(result, { stdout: "stdout text", stderr: "stderr text" });
});

test("execOpenSsh attaches stdout stderr and endpoint to failures", async () => {
  const endpoint = { host: "150.158.146.192", port: 6223 };
  await assert.rejects(
    () => execOpenSsh({
      execFile: (command, args, options, callback) => ({
        stdin: {
          end: () => {
            callback(new Error("ssh failed"), "out", "err");
          }
        }
      }),
      endpoint,
      user: "linaro",
      identityFile: "/tmp/id_ed25519",
      knownHosts: "/tmp/known_hosts",
      remoteCommand: "hostname"
    }),
    error => {
      assert.equal(error.message, "ssh failed");
      assert.equal(error.stdout, "out");
      assert.equal(error.stderr, "err");
      assert.equal(error.endpoint, endpoint);
      return true;
    }
  );
});

test("buildPasswordSshPayload captures password fallback command context", () => {
  const payload = buildPasswordSshPayload({
    endpoint: { host: "150.158.146.192", port: 6223 },
    user: "linaro",
    password: "secret",
    remoteCommand: "hostname",
    timeout: 12345,
    input: "stdin payload"
  });

  assert.deepEqual(JSON.parse(payload), {
    host: "150.158.146.192",
    port: 6223,
    user: "linaro",
    password: "secret",
    command: "hostname",
    timeout: 12345,
    input: "stdin payload"
  });
});

test("execPasswordSsh runs the Python sshpass adapter with payload stdin", async () => {
  let observed = {};
  const result = await execPasswordSsh({
    execFile: (command, args, options, callback) => {
      observed = { command, args, options, input: "" };
      return {
        stdin: {
          end: input => {
            observed.input = input;
            callback(null, "stdout text", "stderr text");
          }
        }
      };
    },
    pythonBin: "python3",
    endpoint: { host: "150.158.146.192", port: 6223 },
    user: "linaro",
    password: "secret",
    remoteCommand: "cat",
    timeout: 1234,
    input: "payload",
    cwd: "/work",
    env: { PATH: "/bin" }
  });

  assert.equal(observed.command, "python3");
  assert.equal(observed.args[0], "-c");
  assert.match(observed.args[1], /sshpass/);
  assert.equal(observed.options.cwd, "/work");
  assert.equal(observed.options.timeout, 36234);
  assert.equal(observed.options.windowsHide, true);
  assert.equal(observed.options.env.PYTHONIOENCODING, "utf-8");
  assert.equal(observed.options.env.PATH, "/bin");
  assert.deepEqual(JSON.parse(observed.input), {
    host: "150.158.146.192",
    port: 6223,
    user: "linaro",
    password: "secret",
    command: "cat",
    timeout: 1234,
    input: "payload"
  });
  assert.deepEqual(result, { stdout: "stdout text", stderr: "stderr text" });
});

test("execPasswordSsh attaches stdout and stderr to failures", async () => {
  await assert.rejects(
    () => execPasswordSsh({
      execFile: (command, args, options, callback) => ({
        stdin: {
          end: () => {
            callback(new Error("python failed"), "out", "err");
          }
        }
      }),
      pythonBin: "python3",
      endpoint: { host: "150.158.146.192", port: 6223 },
      user: "linaro",
      password: "secret",
      remoteCommand: "hostname"
    }),
    error => {
      assert.equal(error.message, "python failed");
      assert.equal(error.stdout, "out");
      assert.equal(error.stderr, "err");
      return true;
    }
  );
});

test("buildUploadTextCommand and payload preserve base64 temp-file upload behavior", () => {
  const command = buildUploadTextCommand("/home/linaro/work dir/file's.txt");
  const payload = buildUploadTextPayload(Buffer.from("hello"));

  assert.equal(payload, "aGVsbG8=\n");
  assert.equal(command, [
    "set -eu",
    `tmp='/home/linaro/work dir/file'"'"'s.txt.tmp.$$'`,
    "base64 -d > \"$tmp\"",
    `mv "$tmp" '/home/linaro/work dir/file'"'"'s.txt'`
  ].join("\n"));
});

test("buildUploadBundlePayload encodes local file entries for the remote uploader", async () => {
  const files = [
    { path: "/remote/index.html", mode: "", data: Buffer.from("index").toString("base64") },
    { path: "/remote/start.sh", mode: "0755", data: Buffer.from("run").toString("base64") }
  ];

  const payload = buildUploadBundlePayload(files);

  assert.deepEqual(JSON.parse(Buffer.from(payload, "base64").toString("utf8")), { files });
});

test("buildUploadBundleCommand installs and runs the remote Python uploader", () => {
  const files = [
    { path: "/remote/index.html", mode: "", data: Buffer.from("index").toString("base64") }
  ];
  const command = buildUploadBundleCommand(files);

  assert.match(command, /^s=\/tmp\/vb_upload_\$\$\.py; /);
  assert.match(command, /echo '[A-Za-z0-9+/=]+' \| base64 -d > \$s/);
  assert.match(command, /echo '[A-Za-z0-9+/=]+' \| base64 -d \| python3 \$s/);
  assert.match(command, /rm -f \$s$/);
  assert.match(Buffer.from(command.match(/echo '([^']+)' \| base64 -d > \$s/)[1], "base64").toString("utf8"), /os\.replace\(tmp, p\)/);
});

test("buildWslSshArgs preserves WSL sshpass invocation", () => {
  const args = buildWslSshArgs({
    endpoint: { host: "150.158.146.192", port: 6223 },
    user: "linaro",
    password: "secret",
    remoteCommand: "hostname"
  });

  assert.deepEqual(args, [
    "sshpass", "-p", "secret",
    "ssh", "-o", "StrictHostKeyChecking=no",
    "-o", "ConnectTimeout=20",
    "-p", "6223",
    "linaro@150.158.146.192",
    "hostname"
  ]);
});

test("execWslSsh runs wsl.exe with optional stdin input", async () => {
  let observed = {};
  const result = await execWslSsh({
    execFile: (command, args, options, callback) => {
      observed = { command, args, options, input: "" };
      return {
        stdin: {
          end: input => {
            observed.input = input;
            callback(null, "stdout text", "stderr text");
          }
        }
      };
    },
    endpoint: { host: "150.158.146.192", port: 6223 },
    user: "linaro",
    password: "secret",
    remoteCommand: "cat",
    timeout: 1234,
    input: "payload"
  });

  assert.equal(observed.command, "wsl.exe");
  assert.deepEqual(observed.args.slice(-3), ["6223", "linaro@150.158.146.192", "cat"]);
  assert.equal(observed.options.timeout, 26234);
  assert.equal(observed.options.windowsHide, true);
  assert.equal(observed.input, "payload");
  assert.deepEqual(result, { stdout: "stdout text", stderr: "stderr text" });
});

test("execWslSsh attaches stdout and stderr to failures", async () => {
  await assert.rejects(
    () => execWslSsh({
      execFile: (command, args, options, callback) => ({
        stdin: {
          end: () => {
            callback(new Error("wsl failed"), "out", "err");
          }
        }
      }),
      endpoint: { host: "150.158.146.192", port: 6223 },
      user: "linaro",
      password: "secret",
      remoteCommand: "hostname"
    }),
    error => {
      assert.equal(error.message, "wsl failed");
      assert.equal(error.stdout, "out");
      assert.equal(error.stderr, "err");
      return true;
    }
  );
});

test("runAcrossEndpoints reuses active endpoint first and returns success metadata", async () => {
  const calls = [];
  const active = { name: "configured", host: "192.168.1.31", port: 22 };
  const result = await runAcrossEndpoints({
    activeEndpoint: active,
    endpoints: [{ name: "frp", host: "150.158.146.192", port: 6223 }, active],
    attempts: 2,
    retryPattern: /timed out/i,
    endpointLabel: endpoint => `${endpoint.name}:${endpoint.host}:${endpoint.port}`,
    runOnce: async endpoint => {
      calls.push(endpoint.name);
      return { stdout: endpoint.host };
    }
  });

  assert.equal(result.endpoint, active);
  assert.deepEqual(calls, ["configured"]);
  assert.deepEqual(result.result, { stdout: "192.168.1.31" });
});

test("runAcrossEndpoints retries connection failures and then tries the next endpoint", async () => {
  const calls = [];
  const result = await runAcrossEndpoints({
    boardLabel: "透明版",
    endpoints: [
      { name: "frp", host: "150.158.146.192", port: 6223 },
      { name: "configured", host: "192.168.1.31", port: 22 }
    ],
    attempts: 2,
    retryPattern: /timed out/i,
    retryDelay: () => 0,
    endpointLabel: endpoint => `${endpoint.name}:${endpoint.host}:${endpoint.port}`,
    runOnce: async endpoint => {
      calls.push(endpoint.name);
      if (endpoint.name === "frp") {
        const error = new Error("Connection timed out");
        error.stderr = "Connection timed out";
        throw error;
      }
      return { stdout: "ok" };
    }
  });

  assert.deepEqual(calls, ["frp", "frp", "configured"]);
  assert.equal(result.endpoint.name, "configured");
  assert.equal(result.result.stdout, "ok");
});

test("runAcrossEndpoints does not retry non-retryable failures on the same endpoint", async () => {
  const calls = [];
  await assert.rejects(
    () => runAcrossEndpoints({
      boardLabel: "透明版",
      endpoints: [{ name: "frp", host: "150.158.146.192", port: 6223 }],
      attempts: 3,
      retryPattern: /timed out/i,
      endpointLabel: endpoint => `${endpoint.name}:${endpoint.host}:${endpoint.port}`,
      runOnce: async endpoint => {
        calls.push(endpoint.name);
        const error = new Error("Permission denied");
        error.stderr = "Permission denied (publickey,password).";
        throw error;
      }
    }),
    /Unable to reach 透明版/
  );
  assert.deepEqual(calls, ["frp"]);
});
