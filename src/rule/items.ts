import { BinaryReader, BinaryWriter } from "../binary.js";
import { decodeString, encodeString } from "../bytes.js";
import { RULE_ITEM_NETWORK_INTERFACE_ADDRESS } from "../constants.js";
import { buildIPRanges, ipSetToCIDRs, readIPSet, readPrefix, writeIPSet, writePrefix } from "../ip.js";
import { toListable } from "../validation.js";
import { formatInterfaceType, type NetworkInterfaceAddressEntry } from "./interface.js";

export function writeRuleItemString(writer: BinaryWriter, itemType: number, values: string[]): void {
  writer.writeByte(itemType);
  writer.writeUvarint(values.length);
  for (const value of values) {
    const bytes = encodeString(value);
    writer.writeUvarint(bytes.length);
    writer.writeBytes(bytes);
  }
}

export function readRuleItemString(reader: BinaryReader): string[] {
  const length = reader.readUvarint();
  const result: string[] = [];
  for (let i = 0; i < length; i++) {
    result.push(decodeString(reader.readBytes(reader.readUvarint())));
  }
  return result;
}

export function writeRuleItemUint8(writer: BinaryWriter, itemType: number, values: number[]): void {
  writer.writeByte(itemType);
  writer.writeUvarint(values.length);
  for (const value of values) {
    writer.writeByte(value);
  }
}

export function readRuleItemUint8(reader: BinaryReader): number[] {
  const length = reader.readUvarint();
  const result: number[] = [];
  for (let i = 0; i < length; i++) {
    result.push(reader.readByte());
  }
  return result;
}

export function writeRuleItemUint16(writer: BinaryWriter, itemType: number, values: number[]): void {
  writer.writeByte(itemType);
  writer.writeUvarint(values.length);
  for (const value of values) {
    writer.writeUint16(value);
  }
}

export function readRuleItemUint16(reader: BinaryReader): number[] {
  const length = reader.readUvarint();
  const result: number[] = [];
  for (let i = 0; i < length; i++) {
    result.push(reader.readUint16());
  }
  return result;
}

export function writeRuleItemCIDR(writer: BinaryWriter, itemType: number, values: string[]): void {
  writer.writeByte(itemType);
  writeIPSet(writer, buildIPRanges(values));
}

export function readRuleItemCIDR(reader: BinaryReader): string[] {
  return ipSetToCIDRs(readIPSet(reader));
}

export function writeRuleItemPrefixList(writer: BinaryWriter, itemType: number, values: string[]): void {
  writer.writeByte(itemType);
  writer.writeUvarint(values.length);
  for (const value of values) {
    writePrefix(writer, value);
  }
}

export function readRuleItemPrefixList(reader: BinaryReader): string[] {
  const length = reader.readUvarint();
  const result: string[] = [];
  for (let i = 0; i < length; i++) {
    result.push(readPrefix(reader));
  }
  return result;
}

export function writeRuleItemNetworkInterfaceAddress(
  writer: BinaryWriter,
  values: NetworkInterfaceAddressEntry[]
): void {
  writer.writeByte(RULE_ITEM_NETWORK_INTERFACE_ADDRESS);
  writer.writeUvarint(values.length);
  for (const value of values) {
    writer.writeByte(value.type);
    writer.writeUvarint(value.prefixes.length);
    for (const prefix of value.prefixes) {
      writePrefix(writer, prefix);
    }
  }
}

export function readRuleItemNetworkInterfaceAddress(reader: BinaryReader): Record<string, string | string[]> {
  const length = reader.readUvarint();
  const result: Record<string, string | string[]> = {};
  for (let i = 0; i < length; i++) {
    const key = String(formatInterfaceType(reader.readByte()));
    result[key] = toListable(readRuleItemPrefixList(reader));
  }
  return result;
}
