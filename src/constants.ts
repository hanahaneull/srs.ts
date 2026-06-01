export const MAGIC = new Uint8Array([0x53, 0x52, 0x53]);
export const MAX_RULE_SET_VERSION = 5;

export const RULE_TYPE_DEFAULT = 0;
export const RULE_TYPE_LOGICAL = 1;

export const RULE_ITEM_QUERY_TYPE = 0;
export const RULE_ITEM_NETWORK = 1;
export const RULE_ITEM_DOMAIN = 2;
export const RULE_ITEM_DOMAIN_KEYWORD = 3;
export const RULE_ITEM_DOMAIN_REGEX = 4;
export const RULE_ITEM_SOURCE_IP_CIDR = 5;
export const RULE_ITEM_IP_CIDR = 6;
export const RULE_ITEM_SOURCE_PORT = 7;
export const RULE_ITEM_SOURCE_PORT_RANGE = 8;
export const RULE_ITEM_PORT = 9;
export const RULE_ITEM_PORT_RANGE = 10;
export const RULE_ITEM_PROCESS_NAME = 11;
export const RULE_ITEM_PROCESS_PATH = 12;
export const RULE_ITEM_PACKAGE_NAME = 13;
export const RULE_ITEM_WIFI_SSID = 14;
export const RULE_ITEM_WIFI_BSSID = 15;
export const RULE_ITEM_ADGUARD_DOMAIN = 16;
export const RULE_ITEM_PROCESS_PATH_REGEX = 17;
export const RULE_ITEM_NETWORK_TYPE = 18;
export const RULE_ITEM_NETWORK_IS_EXPENSIVE = 19;
export const RULE_ITEM_NETWORK_IS_CONSTRAINED = 20;
export const RULE_ITEM_NETWORK_INTERFACE_ADDRESS = 21;
export const RULE_ITEM_DEFAULT_INTERFACE_ADDRESS = 22;
export const RULE_ITEM_PACKAGE_NAME_REGEX = 23;
export const RULE_ITEM_FINAL = 0xff;

export const PREFIX_LABEL = "\r";
export const ROOT_LABEL = "\n";

export const DEFAULT_RULE_KEYS = new Set([
  "type",
  "query_type",
  "network",
  "domain",
  "domain_suffix",
  "domain_keyword",
  "domain_regex",
  "source_ip_cidr",
  "ip_cidr",
  "source_port",
  "source_port_range",
  "port",
  "port_range",
  "process_name",
  "process_path",
  "process_path_regex",
  "package_name",
  "package_name_regex",
  "network_type",
  "network_is_expensive",
  "network_is_constrained",
  "network_interface_address",
  "default_interface_address",
  "wifi_ssid",
  "wifi_bssid",
  "invert"
]);
