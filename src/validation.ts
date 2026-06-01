import { DEFAULT_RULE_KEYS, MAX_RULE_SET_VERSION } from "./constants.js";
import type { DefaultRule } from "./types.js";

export function normalizeVersion(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0 || value > MAX_RULE_SET_VERSION) {
    throw new Error(`unsupported rule-set version: ${String(value)}`);
  }
  return value;
}

export function normalizeStringList(value: unknown, name: string): string[] {
  if (value === undefined) return [];
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be a string or string array`);
  }
  return value.map((item, index) => {
    if (typeof item !== "string") {
      throw new Error(`${name}[${index}] must be a string`);
    }
    return item;
  });
}

export function normalizeNumberList(value: unknown, name: string): number[] {
  if (value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.map((item, index) => {
    if (!Number.isInteger(item)) {
      throw new Error(`${name}[${index}] must be an integer`);
    }
    if (item < 0 || item > 0xffff) {
      throw new Error(`${name}[${index}] must fit in uint16`);
    }
    return item;
  });
}

export function toListable<T>(values: T[]): T | T[] {
  return values.length === 1 ? values[0] : values;
}

export function assertSupportedDefaultRule(rule: DefaultRule): void {
  for (const key of Object.keys(rule)) {
    if (!DEFAULT_RULE_KEYS.has(key)) {
      throw new Error(`unsupported default rule item: ${key}`);
    }
  }
  if (rule.network_is_expensive !== undefined && typeof rule.network_is_expensive !== "boolean") {
    throw new Error("network_is_expensive must be a boolean");
  }
  if (rule.network_is_constrained !== undefined && typeof rule.network_is_constrained !== "boolean") {
    throw new Error("network_is_constrained must be a boolean");
  }
  if (rule.invert !== undefined && typeof rule.invert !== "boolean") {
    throw new Error("invert must be a boolean");
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function safeBigIntToNumber(value: bigint, name: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${name} exceeds safe integer range: ${value}`);
  }
  return Number(value);
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
