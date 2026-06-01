import { unzlibSync, zlibSync } from "fflate/browser";

import { BinaryReader, BinaryWriter } from "./binary.js";
import { bytesEqual, concatBytes } from "./bytes.js";
import { MAGIC, MAX_RULE_SET_VERSION } from "./constants.js";
import { readRule, writeRule } from "./rule/index.js";
import type { PlainRuleSet, Rule } from "./types.js";
import { messageOf, normalizeVersion } from "./validation.js";

export type {
  DefaultRule,
  LogicalRule,
  NetworkInterfaceAddress,
  PlainRuleSet,
  PrimitiveRuleValue,
  Rule,
  RuleListable
} from "./types.js";

export function compile(ruleSet: PlainRuleSet): Uint8Array {
  const version = normalizeVersion(ruleSet.version);
  if (!Array.isArray(ruleSet.rules)) {
    throw new Error("rule-set rules must be an array");
  }

  const payload = new BinaryWriter();
  payload.writeUvarint(ruleSet.rules.length);
  for (const rule of ruleSet.rules) {
    writeRule(payload, rule, version);
  }

  return concatBytes([
    MAGIC,
    new Uint8Array([version]),
    zlibSync(payload.toUint8Array(), { level: 9 })
  ]);
}

export function decompile(data: Uint8Array): PlainRuleSet {
  const reader = new BinaryReader(data);
  const magic = reader.readBytes(3);
  if (!bytesEqual(magic, MAGIC)) {
    throw new Error("invalid sing-box rule-set file");
  }

  const version = reader.readByte();
  if (version > MAX_RULE_SET_VERSION) {
    throw new Error(`unsupported rule-set version: ${version}`);
  }

  const payloadData = unzlibSync(reader.readRemainingBytes());
  const payload = new BinaryReader(payloadData);
  const ruleCount = payload.readUvarint();
  const rules: Rule[] = [];
  for (let i = 0; i < ruleCount; i++) {
    try {
      rules.push(readRule(payload));
    } catch (error) {
      throw new Error(`read rule[${i}]: ${messageOf(error)}`);
    }
  }

  return { version, rules };
}
