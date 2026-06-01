import { readFile, writeFile } from "node:fs/promises";
import { extname } from "node:path";

import { compile, decompile, type PlainRuleSet } from "./index.js";

type Command = "compile" | "decompile";

const usage = `Usage:
  srs.ts compile <file.json> [output.srs]
  srs.ts decompile <file.srs> [output.json]

Examples:
  srs.ts compile rules.srs      # reads rules.json, writes rules.srs
  srs.ts compile rules.json     # reads rules.json, writes rules.srs
  srs.ts decompile rules.json   # reads rules.srs, writes rules.json
  srs.ts decompile rules.srs    # reads rules.srs, writes rules.json`;

async function main(argv: string[]): Promise<void> {
  const [command, filePath, outputPath, extra] = argv;

  if (command === "--help" || command === "-h") {
    console.log(usage);
    return;
  }

  if (!isCommand(command) || !filePath || extra) {
    throw new Error(usage);
  }

  const paths = resolvePaths(command, filePath, outputPath);
  if (command === "compile") {
    await compileFile(paths.inputPath, paths.outputPath);
  } else {
    await decompileFile(paths.inputPath, paths.outputPath);
  }
}

function resolvePaths(command: Command, filePath: string, outputPath?: string): { inputPath: string; outputPath: string } {
  if (outputPath) {
    return { inputPath: filePath, outputPath };
  }

  const extension = extname(filePath).toLowerCase();
  if (command === "compile") {
    if (extension === ".srs") return { inputPath: withExtension(filePath, ".json"), outputPath: filePath };
    return { inputPath: filePath, outputPath: withExtension(filePath, ".srs") };
  }

  if (extension === ".json") return { inputPath: withExtension(filePath, ".srs"), outputPath: filePath };
  return { inputPath: filePath, outputPath: withExtension(filePath, ".json") };
}

async function compileFile(inputPath: string, outputPath: string): Promise<void> {
  const source = await readFile(inputPath, "utf8");
  const ruleSet = JSON.parse(source) as PlainRuleSet;
  await writeFile(outputPath, compile(ruleSet));
}

async function decompileFile(inputPath: string, outputPath: string): Promise<void> {
  const source = new Uint8Array(await readFile(inputPath));
  const ruleSet = decompile(source);
  await writeFile(outputPath, `${JSON.stringify(ruleSet, null, 2)}\n`);
}

function withExtension(filePath: string, extension: string): string {
  const currentExtension = extname(filePath);
  return currentExtension ? `${filePath.slice(0, -currentExtension.length)}${extension}` : `${filePath}${extension}`;
}

function isCommand(value: string | undefined): value is Command {
  return value === "compile" || value === "decompile";
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(messageOf(error));
  process.exitCode = 1;
});

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
