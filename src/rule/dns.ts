import { normalizeUint16 } from "./numeric.js";

export function normalizeQueryTypeList(value: unknown, name: string): number[] {
  if (value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.map((item, index) => {
    if (typeof item === "string") {
      const queryType = DNS_QUERY_TYPE_BY_NAME.get(item.toUpperCase());
      if (queryType === undefined) {
        throw new Error(`${name}[${index}] is an unknown DNS query type`);
      }
      return queryType;
    }
    return normalizeUint16(item, `${name}[${index}]`);
  });
}

export function formatQueryType(value: number): string | number {
  return DNS_QUERY_TYPE_BY_VALUE.get(value) ?? value;
}

const DNS_QUERY_TYPES: Array<[string, number]> = [
  ["None", 0],
  ["A", 1],
  ["NS", 2],
  ["MD", 3],
  ["MF", 4],
  ["CNAME", 5],
  ["SOA", 6],
  ["MB", 7],
  ["MG", 8],
  ["MR", 9],
  ["NULL", 10],
  ["PTR", 12],
  ["HINFO", 13],
  ["MINFO", 14],
  ["MX", 15],
  ["TXT", 16],
  ["RP", 17],
  ["AFSDB", 18],
  ["X25", 19],
  ["ISDN", 20],
  ["RT", 21],
  ["NSAP-PTR", 23],
  ["SIG", 24],
  ["KEY", 25],
  ["PX", 26],
  ["GPOS", 27],
  ["AAAA", 28],
  ["LOC", 29],
  ["NXT", 30],
  ["EID", 31],
  ["NIMLOC", 32],
  ["SRV", 33],
  ["ATMA", 34],
  ["NAPTR", 35],
  ["KX", 36],
  ["CERT", 37],
  ["DNAME", 39],
  ["OPT", 41],
  ["APL", 42],
  ["DS", 43],
  ["SSHFP", 44],
  ["IPSECKEY", 45],
  ["RRSIG", 46],
  ["NSEC", 47],
  ["DNSKEY", 48],
  ["DHCID", 49],
  ["NSEC3", 50],
  ["NSEC3PARAM", 51],
  ["TLSA", 52],
  ["SMIMEA", 53],
  ["HIP", 55],
  ["NINFO", 56],
  ["RKEY", 57],
  ["TALINK", 58],
  ["CDS", 59],
  ["CDNSKEY", 60],
  ["OPENPGPKEY", 61],
  ["CSYNC", 62],
  ["ZONEMD", 63],
  ["SVCB", 64],
  ["HTTPS", 65],
  ["SPF", 99],
  ["UINFO", 100],
  ["UID", 101],
  ["GID", 102],
  ["UNSPEC", 103],
  ["NID", 104],
  ["L32", 105],
  ["L64", 106],
  ["LP", 107],
  ["EUI48", 108],
  ["EUI64", 109],
  ["NXNAME", 128],
  ["URI", 256],
  ["CAA", 257],
  ["AVC", 258],
  ["AMTRELAY", 260],
  ["RESINFO", 261],
  ["TKEY", 249],
  ["TSIG", 250],
  ["IXFR", 251],
  ["AXFR", 252],
  ["MAILB", 253],
  ["MAILA", 254],
  ["ANY", 255],
  ["TA", 32768],
  ["DLV", 32769],
  ["Reserved", 65535]
];

const DNS_QUERY_TYPE_BY_NAME = new Map<string, number>(
  DNS_QUERY_TYPES.map(([name, value]) => [name.toUpperCase(), value])
);

const DNS_QUERY_TYPE_BY_VALUE = new Map<number, string>(DNS_QUERY_TYPES.map(([name, value]) => [value, name]));
