import { BinaryReader, BinaryWriter } from "./binary.js";
import type { IPRange, ParsedIP } from "./types.js";
import { safeBigIntToNumber } from "./validation.js";

export interface IPPrefix {
  version: 4 | 6;
  address: bigint;
  bits: number;
}

export function writeIPSet(writer: BinaryWriter, ranges: IPRange[]): void {
  writer.writeByte(1);
  writer.writeUint64(BigInt(ranges.length));
  for (const range of ranges) {
    const from = ipValueToBytes(range.from, range.version);
    writer.writeUvarint(from.length);
    writer.writeBytes(from);

    const to = ipValueToBytes(range.to, range.version);
    writer.writeUvarint(to.length);
    writer.writeBytes(to);
  }
}

export function readIPSet(reader: BinaryReader): IPRange[] {
  const version = reader.readByte();
  if (version !== 1) {
    throw new Error(`unsupported IP set version: ${version}`);
  }

  const length = safeBigIntToNumber(reader.readUint64(), "IP set length");
  const ranges: IPRange[] = [];
  for (let i = 0; i < length; i++) {
    const fromBytes = reader.readBytes(reader.readUvarint());
    const toBytes = reader.readBytes(reader.readUvarint());
    const from = bytesToIPValue(fromBytes);
    const to = bytesToIPValue(toBytes);
    if (from.version !== to.version) {
      throw new Error(`mixed IP versions in range[${i}]`);
    }
    ranges.push({ version: from.version, from: from.value, to: to.value });
  }
  return mergeIPRanges(ranges);
}

export function buildIPRanges(values: string[]): IPRange[] {
  return mergeIPRanges(values.map(parseCIDR));
}

export function ipSetToCIDRs(ranges: IPRange[]): string[] {
  const result: string[] = [];
  for (const range of ranges) {
    result.push(...rangeToCIDRs(range));
  }
  return result;
}

export function writePrefix(writer: BinaryWriter, value: string): void {
  const prefix = parsePrefixable(value);
  const bytes = ipValueToBytes(prefix.address, prefix.version);
  writer.writeUvarint(bytes.length);
  writer.writeBytes(bytes);
  writer.writeByte(prefix.bits);
}

export function readPrefix(reader: BinaryReader): string {
  const address = bytesToIPValue(reader.readBytes(reader.readUvarint()));
  const bits = reader.readByte();
  const maxBits = address.version === 4 ? 32 : 128;
  if (bits > maxBits) {
    throw new Error(`invalid prefix bits for IPv${address.version}: ${bits}`);
  }
  return formatPrefixable({ version: address.version, address: address.value, bits });
}

function parseCIDR(value: string): IPRange {
  const prefix = parsePrefixable(value);
  const maxBits = prefix.version === 4 ? 32 : 128;
  const size = 1n << BigInt(maxBits - prefix.bits);
  const from = (prefix.address / size) * size;
  return { version: prefix.version, from, to: from + size - 1n };
}

function parsePrefixable(value: string): IPPrefix {
  const slash = value.indexOf("/");
  const rawAddress = slash === -1 ? value : value.slice(0, slash);
  const address = parseIP(rawAddress);
  const maxBits = address.version === 4 ? 32 : 128;
  let prefixBits = maxBits;

  if (slash !== -1) {
    const rawBits = value.slice(slash + 1);
    if (!/^\d+$/.test(rawBits)) {
      throw new Error(`invalid CIDR prefix bits: ${value}`);
    }
    prefixBits = Number(rawBits);
  }

  if (!Number.isInteger(prefixBits) || prefixBits < 0 || prefixBits > maxBits) {
    throw new Error(`invalid CIDR prefix bits: ${value}`);
  }

  return { version: address.version, address: address.value, bits: prefixBits };
}

function formatPrefixable(prefix: IPPrefix): string {
  const maxBits = prefix.version === 4 ? 32 : 128;
  const address = formatIP(prefix.address, prefix.version);
  return prefix.bits === maxBits ? address : `${address}/${prefix.bits}`;
}

function parseIP(value: string): ParsedIP {
  if (value.includes(":")) {
    return { version: 6, value: parseIPv6(value) };
  }
  return { version: 4, value: parseIPv4(value) };
}

function parseIPv4(value: string): bigint {
  const parts = value.split(".");
  if (parts.length !== 4) {
    throw new Error(`invalid IPv4 address: ${value}`);
  }

  let result = 0n;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      throw new Error(`invalid IPv4 address: ${value}`);
    }
    const octet = Number(part);
    if (octet < 0 || octet > 255) {
      throw new Error(`invalid IPv4 address: ${value}`);
    }
    result = (result << 8n) | BigInt(octet);
  }
  return result;
}

function parseIPv6(value: string): bigint {
  if (value.includes("%")) {
    throw new Error(`IPv6 zones are not supported in rule-set addresses: ${value}`);
  }

  let normalized = value.toLowerCase();
  if (normalized.includes(".")) {
    const lastColon = normalized.lastIndexOf(":");
    if (lastColon === -1) {
      throw new Error(`invalid IPv6 address: ${value}`);
    }
    const ipv4 = parseIPv4(normalized.slice(lastColon + 1));
    const high = Number((ipv4 >> 16n) & 0xffffn).toString(16);
    const low = Number(ipv4 & 0xffffn).toString(16);
    normalized = `${normalized.slice(0, lastColon)}:${high}:${low}`;
  }

  const halves = normalized.split("::");
  if (halves.length > 2) {
    throw new Error(`invalid IPv6 address: ${value}`);
  }

  const left = halves[0] === "" ? [] : halves[0].split(":");
  const right = halves.length === 1 || halves[1] === "" ? [] : halves[1].split(":");
  if (left.some((part) => part === "") || right.some((part) => part === "")) {
    throw new Error(`invalid IPv6 address: ${value}`);
  }

  let groups: string[];
  if (halves.length === 1) {
    groups = left;
    if (groups.length !== 8) {
      throw new Error(`invalid IPv6 address: ${value}`);
    }
  } else {
    const zeroCount = 8 - left.length - right.length;
    if (zeroCount < 1) {
      throw new Error(`invalid IPv6 address: ${value}`);
    }
    groups = [...left, ...new Array<string>(zeroCount).fill("0"), ...right];
  }

  let result = 0n;
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(group)) {
      throw new Error(`invalid IPv6 address: ${value}`);
    }
    result = (result << 16n) | BigInt(parseInt(group, 16));
  }
  return result;
}

function bytesToIPValue(bytes: Uint8Array): ParsedIP {
  if (bytes.length !== 4 && bytes.length !== 16) {
    throw new Error(`invalid IP byte length: ${bytes.length}`);
  }
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  return { version: bytes.length === 4 ? 4 : 6, value };
}

function ipValueToBytes(value: bigint, version: 4 | 6): Uint8Array {
  const length = version === 4 ? 4 : 16;
  const bytes = new Uint8Array(length);
  let remaining = value;
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return bytes;
}

function mergeIPRanges(ranges: IPRange[]): IPRange[] {
  ranges.sort((left, right) => {
    if (left.version !== right.version) return left.version - right.version;
    if (left.from < right.from) return -1;
    if (left.from > right.from) return 1;
    if (left.to < right.to) return -1;
    if (left.to > right.to) return 1;
    return 0;
  });

  const merged: IPRange[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last !== undefined && last.version === range.version && range.from <= last.to + 1n) {
      if (range.to > last.to) last.to = range.to;
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

function rangeToCIDRs(range: IPRange): string[] {
  const maxBits = range.version === 4 ? 32 : 128;
  const result: string[] = [];
  let current = range.from;

  while (current <= range.to) {
    const remaining = range.to - current + 1n;
    let size = largestAlignedBlock(current, maxBits);
    while (size > remaining) {
      size >>= 1n;
    }
    const prefixLength = maxBits - log2PowerOfTwo(size);
    result.push(`${formatIP(current, range.version)}/${prefixLength}`);
    current += size;
  }

  return result;
}

function largestAlignedBlock(value: bigint, bits: number): bigint {
  if (value === 0n) {
    return 1n << BigInt(bits);
  }
  return value & -value;
}

function log2PowerOfTwo(value: bigint): number {
  let result = 0;
  let next = value;
  while (next > 1n) {
    next >>= 1n;
    result += 1;
  }
  return result;
}

function formatIP(value: bigint, version: 4 | 6): string {
  return version === 4 ? formatIPv4(value) : formatIPv6(value);
}

function formatIPv4(value: bigint): string {
  return [24n, 16n, 8n, 0n].map((shift) => Number((value >> shift) & 0xffn)).join(".");
}

function formatIPv6(value: bigint): string {
  const groups: number[] = [];
  for (let shift = 112n; shift >= 0n; shift -= 16n) {
    groups.push(Number((value >> shift) & 0xffffn));
  }

  let bestStart = -1;
  let bestLength = 0;
  for (let i = 0; i < groups.length;) {
    if (groups[i] !== 0) {
      i += 1;
      continue;
    }
    const start = i;
    while (i < groups.length && groups[i] === 0) {
      i += 1;
    }
    const length = i - start;
    if (length > bestLength && length >= 2) {
      bestStart = start;
      bestLength = length;
    }
  }

  const rendered = groups.map((group) => group.toString(16));
  if (bestStart === -1) {
    return rendered.join(":");
  }

  const left = rendered.slice(0, bestStart).join(":");
  const right = rendered.slice(bestStart + bestLength).join(":");
  if (left === "" && right === "") return "::";
  if (left === "") return `::${right}`;
  if (right === "") return `${left}::`;
  return `${left}::${right}`;
}
