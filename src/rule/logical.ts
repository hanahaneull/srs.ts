import { BinaryReader, BinaryWriter } from "../binary.js";
import { RULE_TYPE_LOGICAL } from "../constants.js";
import type { LogicalRule, Rule } from "../types.js";
import { messageOf } from "../validation.js";
import { readRule, writeRule } from "./index.js";

export function writeLogicalRule(writer: BinaryWriter, rule: LogicalRule, version: number): void {
  writer.writeByte(RULE_TYPE_LOGICAL);
  switch (rule.mode) {
    case "and":
      writer.writeByte(0);
      break;
    case "or":
      writer.writeByte(1);
      break;
    default:
      throw new Error(`unknown logical mode: ${String(rule.mode)}`);
  }

  const rules = rule.rules ?? [];
  if (!Array.isArray(rules)) {
    throw new Error("logical rule rules must be an array");
  }
  writer.writeUvarint(rules.length);
  for (const child of rules) {
    writeRule(writer, child, version);
  }
  writer.writeBool(rule.invert === true);
}

export function readLogicalRule(reader: BinaryReader): LogicalRule {
  const modeByte = reader.readByte();
  let mode: "and" | "or";
  switch (modeByte) {
    case 0:
      mode = "and";
      break;
    case 1:
      mode = "or";
      break;
    default:
      throw new Error(`unknown logical mode: ${modeByte}`);
  }

  const ruleCount = reader.readUvarint();
  const rules: Rule[] = [];
  for (let i = 0; i < ruleCount; i++) {
    try {
      rules.push(readRule(reader));
    } catch (error) {
      throw new Error(`read logical rule[${i}]: ${messageOf(error)}`);
    }
  }

  const invert = reader.readBool();
  const rule: LogicalRule = { type: "logical", mode };
  if (rules.length > 0) rule.rules = rules;
  if (invert) rule.invert = true;
  return rule;
}
