import { mkdirSync } from "node:fs";

import { expect, test } from "bun:test";

import { decompile } from "../src/index.ts";

const cliPath = new URL("../src/cli.ts", import.meta.url).pathname;
const exampleJSON = await Bun.file(new URL("./domain.json", import.meta.url)).json();
const exampleSRS = new Uint8Array(await Bun.file(new URL("./domain.srs", import.meta.url)).arrayBuffer());

test("cli compiles to an explicit srs path", async () => {
  const dir = tempDir();
  mkdirSync(dir, { recursive: true });
  await Bun.write(`${dir}/domain.json`, `${JSON.stringify(exampleJSON, null, 2)}\n`);

  runCLI(["compile", `${dir}/domain.srs`]);

  const output = new Uint8Array(await Bun.file(`${dir}/domain.srs`).arrayBuffer());
  expect(decompile(output)).toEqual(exampleJSON);
});

test("cli decompiles to an explicit json path", async () => {
  const dir = tempDir();
  mkdirSync(dir, { recursive: true });
  await Bun.write(`${dir}/domain.srs`, exampleSRS);

  runCLI(["decompile", `${dir}/domain.json`]);

  expect(await Bun.file(`${dir}/domain.json`).json()).toEqual(exampleJSON);
});

test("cli accepts a second output path", async () => {
  const dir = tempDir();
  mkdirSync(dir, { recursive: true });
  await Bun.write(`${dir}/source.json`, `${JSON.stringify(exampleJSON, null, 2)}\n`);

  runCLI(["compile", `${dir}/source.json`, `${dir}/compiled.srs`]);
  runCLI(["decompile", `${dir}/compiled.srs`, `${dir}/decoded.json`]);

  expect(await Bun.file(`${dir}/decoded.json`).json()).toEqual(exampleJSON);
});

function runCLI(args) {
  const result = Bun.spawnSync(["bun", cliPath, ...args], { stdout: "pipe", stderr: "pipe" });
  if (!result.success) {
    throw new Error(`srs.ts ${args.join(" ")} failed\n${decode(result.stderr)}${decode(result.stdout)}`);
  }
}

function tempDir() {
  return `/tmp/srs-ts-cli-${crypto.randomUUID()}`;
}

function decode(bytes) {
  return new TextDecoder().decode(bytes);
}
