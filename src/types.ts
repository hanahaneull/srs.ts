export type RuleListable<T> = T | T[];

export type NetworkInterfaceAddress = Record<string, RuleListable<string>>;

export type PrimitiveRuleValue =
  | string
  | number
  | boolean
  | Array<string | number>
  | NetworkInterfaceAddress
  | undefined;

export interface DefaultRule {
  type?: "default";
  query_type?: RuleListable<string | number>;
  network?: RuleListable<string>;
  domain?: RuleListable<string>;
  domain_suffix?: RuleListable<string>;
  domain_keyword?: RuleListable<string>;
  domain_regex?: RuleListable<string>;
  source_ip_cidr?: RuleListable<string>;
  ip_cidr?: RuleListable<string>;
  source_port?: RuleListable<number>;
  source_port_range?: RuleListable<string>;
  port?: RuleListable<number>;
  port_range?: RuleListable<string>;
  process_name?: RuleListable<string>;
  process_path?: RuleListable<string>;
  process_path_regex?: RuleListable<string>;
  package_name?: RuleListable<string>;
  package_name_regex?: RuleListable<string>;
  network_type?: RuleListable<string | number>;
  network_is_expensive?: boolean;
  network_is_constrained?: boolean;
  network_interface_address?: NetworkInterfaceAddress;
  default_interface_address?: RuleListable<string>;
  wifi_ssid?: RuleListable<string>;
  wifi_bssid?: RuleListable<string>;
  invert?: boolean;
}

export interface LogicalRule {
  type: "logical";
  mode: "and" | "or";
  rules?: Rule[];
  invert?: boolean;
}

export type Rule = DefaultRule | LogicalRule;

export interface PlainRuleSet {
  version: number;
  rules: Rule[];
}

export interface SuccinctSet {
  leaves: bigint[];
  labelBitmap: bigint[];
  labels: Uint8Array;
}

export interface IPRange {
  version: 4 | 6;
  from: bigint;
  to: bigint;
}

export interface ParsedIP {
  version: 4 | 6;
  value: bigint;
}
