import { isRecord } from "../validation.js";
import { normalizeUint8 } from "./numeric.js";

export interface NetworkInterfaceAddressEntry {
  type: number;
  prefixes: string[];
}

export function normalizeInterfaceTypeList(value: unknown, name: string): number[] {
  if (value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.map((item, index) => normalizeInterfaceType(item, `${name}[${index}]`));
}

export function normalizeNetworkInterfaceAddress(value: unknown): NetworkInterfaceAddressEntry[] {
  if (value === undefined) return [];
  if (!isRecord(value)) {
    throw new Error("network_interface_address must be an object");
  }
  return Object.entries(value).map(([key, prefixes]) => ({
    type: normalizeInterfaceType(key, `network_interface_address.${key}`),
    prefixes: normalizePrefixList(prefixes, `network_interface_address.${key}`)
  }));
}

export function normalizePrefixList(value: unknown, name: string): string[] {
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

export function formatInterfaceType(value: number): string | number {
  return INTERFACE_TYPE_BY_VALUE.get(value) ?? value;
}

function normalizeInterfaceType(value: unknown, name: string): number {
  if (typeof value === "string") {
    const named = INTERFACE_TYPE_BY_NAME.get(value);
    if (named !== undefined) return named;
    if (/^\d+$/.test(value)) return normalizeUint8(Number(value), name);
    throw new Error(`${name} is an unknown interface type`);
  }
  return normalizeUint8(value, name);
}

const INTERFACE_TYPE_BY_NAME = new Map<string, number>([
  ["wifi", 0],
  ["cellular", 1],
  ["ethernet", 2],
  ["other", 3]
]);

const INTERFACE_TYPE_BY_VALUE = new Map<number, string>([...INTERFACE_TYPE_BY_NAME].map(([name, value]) => [value, name]));
