import { BinaryReader, BinaryWriter } from "../binary.js";
import { RULE_TYPE_DEFAULT, RULE_TYPE_LOGICAL } from "../constants.js";
import type { DefaultRule, LogicalRule, Rule } from "../types.js";
import { isRecord } from "../validation.js";
import { readDefaultRule, writeDefaultRule } from "./default.js";
import { readLogicalRule, writeLogicalRule } from "./logical.js";

export function writeRule(writer: BinaryWriter, rule: Rule, version: number): void {
  if (!isRecord(rule)) {
    throw new Error("rule must be an object");
  }
  if (rule.type === "logical") {
    writeLogicalRule(writer, rule as unknown as LogicalRule, version);
    return;
  }
  if (rule.type !== undefined && rule.type !== "default") {
    throw new Error(`unknown rule type: ${String(rule.type)}`);
  }
  writeDefaultRule(writer, rule as DefaultRule, version);
}

export function readRule(reader: BinaryReader): Rule {
  const ruleType = reader.readByte();
  switch (ruleType) {
    case RULE_TYPE_DEFAULT:
      return readDefaultRule(reader);
    case RULE_TYPE_LOGICAL:
      return readLogicalRule(reader);
    default:
      throw new Error(`unknown rule type: ${ruleType}`);
  }
}
