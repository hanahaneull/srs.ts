import { concatBytes } from "./bytes.js";

export class BinaryReader {
  #buffer: Uint8Array;
  #view: DataView;
  #offset = 0;

  constructor(data: Uint8Array) {
    this.#buffer = data;
    this.#view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  get remaining(): number {
    return this.#buffer.length - this.#offset;
  }

  readByte(): number {
    this.#ensure(1);
    const value = this.#buffer[this.#offset] ?? 0;
    this.#offset += 1;
    return value;
  }

  readBool(): boolean {
    const value = this.readByte();
    if (value === 0) return false;
    if (value === 1) return true;
    throw new Error(`invalid bool byte: ${value}`);
  }

  readBytes(length: number): Uint8Array {
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new Error(`invalid byte length: ${length}`);
    }
    this.#ensure(length);
    const result = this.#buffer.subarray(this.#offset, this.#offset + length);
    this.#offset += length;
    return result;
  }

  readRemainingBytes(): Uint8Array {
    const result = this.#buffer.subarray(this.#offset);
    this.#offset = this.#buffer.length;
    return result;
  }

  readUvarint(): number {
    let value = 0n;
    let shift = 0n;
    for (let i = 0; i < 10; i++) {
      const b = this.readByte();
      value |= BigInt(b & 0x7f) << shift;
      if ((b & 0x80) === 0) {
        if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
          throw new Error(`uvarint exceeds safe integer range: ${value}`);
        }
        return Number(value);
      }
      shift += 7n;
    }
    throw new Error("uvarint is too large");
  }

  readUint16(): number {
    this.#ensure(2);
    const value = this.#view.getUint16(this.#offset);
    this.#offset += 2;
    return value;
  }

  readUint64(): bigint {
    this.#ensure(8);
    const value = this.#view.getBigUint64(this.#offset);
    this.#offset += 8;
    return value;
  }

  #ensure(length: number): void {
    if (this.#offset + length > this.#buffer.length) {
      throw new Error("unexpected end of SRS data");
    }
  }
}

export class BinaryWriter {
  #chunks: Uint8Array[] = [];

  writeByte(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 0xff) {
      throw new Error(`invalid byte: ${value}`);
    }
    this.#chunks.push(new Uint8Array([value]));
  }

  writeBool(value: boolean): void {
    this.writeByte(value ? 1 : 0);
  }

  writeBytes(value: Uint8Array): void {
    this.#chunks.push(value.slice());
  }

  writeUvarint(value: number | bigint): void {
    let next = typeof value === "bigint" ? value : BigInt(value);
    if (next < 0n) {
      throw new Error(`invalid uvarint: ${value}`);
    }
    while (next >= 0x80n) {
      this.writeByte(Number(next & 0x7fn) | 0x80);
      next >>= 7n;
    }
    this.writeByte(Number(next));
  }

  writeUint16(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
      throw new Error(`invalid uint16: ${value}`);
    }
    const buffer = new Uint8Array(2);
    new DataView(buffer.buffer).setUint16(0, value);
    this.#chunks.push(buffer);
  }

  writeUint64(value: bigint): void {
    if (value < 0n || value > 0xffff_ffff_ffff_ffffn) {
      throw new Error(`invalid uint64: ${value}`);
    }
    const buffer = new Uint8Array(8);
    new DataView(buffer.buffer).setBigUint64(0, value);
    this.#chunks.push(buffer);
  }

  toUint8Array(): Uint8Array {
    return concatBytes(this.#chunks);
  }
}
