import { BinaryReader, BinaryWriter } from "./binary.js";
import { compareBytes, compareGoStrings, decodeString, encodeString } from "./bytes.js";
import { PREFIX_LABEL, ROOT_LABEL } from "./constants.js";
import type { SuccinctSet } from "./types.js";

export function writeDomainMatcher(writer: BinaryWriter, domains: string[], domainSuffixes: string[], legacy: boolean): void {
  const keys: Uint8Array[] = [];
  const seen = new Set<string>();

  for (const domain of domainSuffixes) {
    if (domain.length === 0) {
      throw new Error("domain_suffix entries must not be empty");
    }
    if (seen.has(domain)) continue;
    seen.add(domain);
    if (domain.startsWith(".")) {
      keys.push(domainKeyBytes(`${PREFIX_LABEL}${domain}`));
    } else if (legacy) {
      keys.push(domainKeyBytes(domain));
      const suffixDomain = `.${domain}`;
      if (!seen.has(suffixDomain)) {
        seen.add(suffixDomain);
        keys.push(domainKeyBytes(`${PREFIX_LABEL}${suffixDomain}`));
      }
    } else {
      keys.push(domainKeyBytes(`${ROOT_LABEL}${domain}`));
    }
  }

  for (const domain of domains) {
    if (domain.length === 0) {
      throw new Error("domain entries must not be empty");
    }
    if (seen.has(domain)) continue;
    seen.add(domain);
    keys.push(domainKeyBytes(domain));
  }

  keys.sort(compareBytes);
  writeSuccinctSet(writer, newSuccinctSet(keys));
}

export function readDomainMatcher(reader: BinaryReader): { domain: string[]; domainSuffix: string[] } {
  const domainMap = new Set<string>();
  const prefixMap = new Set<string>();
  const domainSuffix: string[] = [];

  for (const rawKey of succinctSetKeys(readSuccinctSet(reader))) {
    const key = reverseDomain(decodeString(rawKey));
    if (key.startsWith(PREFIX_LABEL)) {
      prefixMap.add(key.slice(PREFIX_LABEL.length));
    } else if (key.startsWith(ROOT_LABEL)) {
      domainSuffix.push(key.slice(ROOT_LABEL.length));
    } else {
      domainMap.add(key);
    }
  }

  for (const rawPrefix of [...prefixMap].sort(compareGoStrings)) {
    if (rawPrefix.startsWith(".")) {
      const rootDomain = rawPrefix.slice(1);
      if (domainMap.has(rootDomain)) {
        domainMap.delete(rootDomain);
        domainSuffix.push(rootDomain);
        continue;
      }
    }
    domainSuffix.push(rawPrefix);
  }

  return {
    domain: [...domainMap].sort(compareGoStrings),
    domainSuffix: domainSuffix.sort(compareGoStrings)
  };
}

function newSuccinctSet(keys: Uint8Array[]): SuccinctSet {
  if (keys.length === 0) {
    throw new Error("succinct domain matcher requires at least one key");
  }

  const leaves: bigint[] = [];
  const labelBitmap: bigint[] = [];
  const labels: number[] = [];
  let labelBitmapIndex = 0;
  const queue: Array<{ start: number; end: number; column: number }> = [{ start: 0, end: keys.length, column: 0 }];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    let start = item.start;
    if (item.column === keys[start].length) {
      start += 1;
      setBit(leaves, i);
    }

    for (let j = start; j < item.end;) {
      const from = j;
      const label = keys[from][item.column];
      while (j < item.end && keys[j][item.column] === label) {
        j += 1;
      }
      queue.push({ start: from, end: j, column: item.column + 1 });
      labels.push(label);
      labelBitmapIndex += 1;
    }

    setBit(labelBitmap, labelBitmapIndex);
    labelBitmapIndex += 1;
  }

  return { leaves, labelBitmap, labels: new Uint8Array(labels) };
}

function writeSuccinctSet(writer: BinaryWriter, set: SuccinctSet): void {
  writer.writeByte(0);
  writeUint64List(writer, set.leaves);
  writeUint64List(writer, set.labelBitmap);
  writer.writeUvarint(set.labels.length);
  writer.writeBytes(set.labels);
}

function readSuccinctSet(reader: BinaryReader): SuccinctSet {
  reader.readByte();
  return {
    leaves: readUint64List(reader),
    labelBitmap: readUint64List(reader),
    labels: reader.readBytes(reader.readUvarint())
  };
}

function succinctSetKeys(set: SuccinctSet): Uint8Array[] {
  const nodeCount = set.labels.length + 1;
  const nodeStarts = new Array<number>(nodeCount);
  const childNodeByBitmapIndex = new Map<number, number>();
  nodeStarts[0] = 0;

  let zeroCount = 0;
  let oneCount = 0;
  for (let bitmapIndex = 0; oneCount < nodeCount; bitmapIndex++) {
    if (getBit(set.labelBitmap, bitmapIndex) !== 0) {
      oneCount += 1;
      if (oneCount < nodeCount) {
        nodeStarts[oneCount] = bitmapIndex + 1;
      }
    } else {
      zeroCount += 1;
      if (zeroCount > set.labels.length) {
        throw new Error("invalid succinct set label bitmap");
      }
      childNodeByBitmapIndex.set(bitmapIndex, zeroCount);
    }
  }

  const result: Uint8Array[] = [];
  const current: number[] = [];

  const traverse = (nodeId: number): void => {
    if (getBit(set.leaves, nodeId) !== 0) {
      result.push(new Uint8Array(current));
    }

    for (let bitmapIndex = nodeStarts[nodeId]; ; bitmapIndex++) {
      if (getBit(set.labelBitmap, bitmapIndex) !== 0) {
        return;
      }
      const labelIndex = bitmapIndex - nodeId;
      const label = set.labels[labelIndex];
      const childNodeId = childNodeByBitmapIndex.get(bitmapIndex);
      if (label === undefined || childNodeId === undefined) {
        throw new Error("invalid succinct set traversal");
      }
      current.push(label);
      traverse(childNodeId);
      current.pop();
    }
  };

  traverse(0);
  return result;
}

function writeUint64List(writer: BinaryWriter, values: bigint[]): void {
  writer.writeUvarint(values.length);
  for (const value of values) {
    writer.writeUint64(value);
  }
}

function readUint64List(reader: BinaryReader): bigint[] {
  const length = reader.readUvarint();
  const result: bigint[] = [];
  for (let i = 0; i < length; i++) {
    result.push(reader.readUint64());
  }
  return result;
}

function setBit(words: bigint[], index: number): void {
  const wordIndex = index >> 6;
  while (words.length <= wordIndex) {
    words.push(0n);
  }
  words[wordIndex] |= 1n << BigInt(index & 63);
}

function getBit(words: bigint[], index: number): number {
  const wordIndex = index >> 6;
  if (wordIndex >= words.length) return 0;
  return Number((words[wordIndex] >> BigInt(index & 63)) & 1n);
}

function domainKeyBytes(domain: string): Uint8Array {
  return encodeString(reverseDomain(domain));
}

function reverseDomain(domain: string): string {
  return Array.from(domain).reverse().join("");
}
