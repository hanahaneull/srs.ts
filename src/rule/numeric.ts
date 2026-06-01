export function normalizeUint8(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${name} must be an integer`);
  }
  if (value < 0 || value > 0xff) {
    throw new Error(`${name} must fit in uint8`);
  }
  return value;
}

export function normalizeUint16(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(`${name} must be an integer`);
  }
  if (value < 0 || value > 0xffff) {
    throw new Error(`${name} must fit in uint16`);
  }
  return value;
}
