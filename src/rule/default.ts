import { BinaryReader, BinaryWriter } from "../binary.js";
import {
  RULE_ITEM_ADGUARD_DOMAIN,
  RULE_ITEM_DEFAULT_INTERFACE_ADDRESS,
  RULE_ITEM_DOMAIN,
  RULE_ITEM_DOMAIN_KEYWORD,
  RULE_ITEM_DOMAIN_REGEX,
  RULE_ITEM_FINAL,
  RULE_ITEM_IP_CIDR,
  RULE_ITEM_NETWORK,
  RULE_ITEM_NETWORK_INTERFACE_ADDRESS,
  RULE_ITEM_NETWORK_IS_CONSTRAINED,
  RULE_ITEM_NETWORK_IS_EXPENSIVE,
  RULE_ITEM_NETWORK_TYPE,
  RULE_ITEM_PACKAGE_NAME,
  RULE_ITEM_PACKAGE_NAME_REGEX,
  RULE_ITEM_PORT,
  RULE_ITEM_PORT_RANGE,
  RULE_ITEM_PROCESS_NAME,
  RULE_ITEM_PROCESS_PATH,
  RULE_ITEM_PROCESS_PATH_REGEX,
  RULE_ITEM_QUERY_TYPE,
  RULE_ITEM_SOURCE_IP_CIDR,
  RULE_ITEM_SOURCE_PORT,
  RULE_ITEM_SOURCE_PORT_RANGE,
  RULE_ITEM_WIFI_BSSID,
  RULE_ITEM_WIFI_SSID,
  RULE_TYPE_DEFAULT
} from "../constants.js";
import { readDomainMatcher, writeDomainMatcher } from "../domain.js";
import type { DefaultRule } from "../types.js";
import { assertSupportedDefaultRule, normalizeNumberList, normalizeStringList, toListable } from "../validation.js";
import { formatQueryType, normalizeQueryTypeList } from "./dns.js";
import {
  formatInterfaceType,
  normalizeInterfaceTypeList,
  normalizeNetworkInterfaceAddress,
  normalizePrefixList
} from "./interface.js";
import {
  readRuleItemCIDR,
  readRuleItemNetworkInterfaceAddress,
  readRuleItemPrefixList,
  readRuleItemString,
  readRuleItemUint16,
  readRuleItemUint8,
  writeRuleItemCIDR,
  writeRuleItemNetworkInterfaceAddress,
  writeRuleItemPrefixList,
  writeRuleItemString,
  writeRuleItemUint16,
  writeRuleItemUint8
} from "./items.js";

export function writeDefaultRule(writer: BinaryWriter, rule: DefaultRule, version: number): void {
  assertSupportedDefaultRule(rule);
  writer.writeByte(RULE_TYPE_DEFAULT);

  const queryType = normalizeQueryTypeList(rule.query_type, "query_type");
  if (queryType.length > 0) writeRuleItemUint16(writer, RULE_ITEM_QUERY_TYPE, queryType);

  const network = normalizeStringList(rule.network, "network");
  if (network.length > 0) writeRuleItemString(writer, RULE_ITEM_NETWORK, network);

  const domain = normalizeStringList(rule.domain, "domain");
  const domainSuffix = normalizeStringList(rule.domain_suffix, "domain_suffix");
  if (domain.length > 0 || domainSuffix.length > 0) {
    writer.writeByte(RULE_ITEM_DOMAIN);
    writeDomainMatcher(writer, domain, domainSuffix, version === 1);
  }

  const domainKeyword = normalizeStringList(rule.domain_keyword, "domain_keyword");
  if (domainKeyword.length > 0) writeRuleItemString(writer, RULE_ITEM_DOMAIN_KEYWORD, domainKeyword);

  const domainRegex = normalizeStringList(rule.domain_regex, "domain_regex");
  if (domainRegex.length > 0) writeRuleItemString(writer, RULE_ITEM_DOMAIN_REGEX, domainRegex);

  const sourceIPCIDR = normalizeStringList(rule.source_ip_cidr, "source_ip_cidr");
  if (sourceIPCIDR.length > 0) writeRuleItemCIDR(writer, RULE_ITEM_SOURCE_IP_CIDR, sourceIPCIDR);

  const ipCIDR = normalizeStringList(rule.ip_cidr, "ip_cidr");
  if (ipCIDR.length > 0) writeRuleItemCIDR(writer, RULE_ITEM_IP_CIDR, ipCIDR);

  const sourcePort = normalizeNumberList(rule.source_port, "source_port");
  if (sourcePort.length > 0) writeRuleItemUint16(writer, RULE_ITEM_SOURCE_PORT, sourcePort);

  const sourcePortRange = normalizeStringList(rule.source_port_range, "source_port_range");
  if (sourcePortRange.length > 0) writeRuleItemString(writer, RULE_ITEM_SOURCE_PORT_RANGE, sourcePortRange);

  const port = normalizeNumberList(rule.port, "port");
  if (port.length > 0) writeRuleItemUint16(writer, RULE_ITEM_PORT, port);

  const portRange = normalizeStringList(rule.port_range, "port_range");
  if (portRange.length > 0) writeRuleItemString(writer, RULE_ITEM_PORT_RANGE, portRange);

  const processName = normalizeStringList(rule.process_name, "process_name");
  if (processName.length > 0) writeRuleItemString(writer, RULE_ITEM_PROCESS_NAME, processName);

  const processPath = normalizeStringList(rule.process_path, "process_path");
  if (processPath.length > 0) writeRuleItemString(writer, RULE_ITEM_PROCESS_PATH, processPath);

  const processPathRegex = normalizeStringList(rule.process_path_regex, "process_path_regex");
  if (processPathRegex.length > 0) writeRuleItemString(writer, RULE_ITEM_PROCESS_PATH_REGEX, processPathRegex);

  const packageName = normalizeStringList(rule.package_name, "package_name");
  if (packageName.length > 0) writeRuleItemString(writer, RULE_ITEM_PACKAGE_NAME, packageName);

  const packageNameRegex = normalizeStringList(rule.package_name_regex, "package_name_regex");
  if (packageNameRegex.length > 0) {
    if (version < 5) {
      throw new Error("package_name_regex rule item is only supported in version 5 or later");
    }
    writeRuleItemString(writer, RULE_ITEM_PACKAGE_NAME_REGEX, packageNameRegex);
  }

  const networkType = normalizeInterfaceTypeList(rule.network_type, "network_type");
  if (networkType.length > 0) {
    if (version < 3) {
      throw new Error("network_type rule item is only supported in version 3 or later");
    }
    writeRuleItemUint8(writer, RULE_ITEM_NETWORK_TYPE, networkType);
  }

  if (rule.network_is_expensive === true) {
    if (version < 3) {
      throw new Error("network_is_expensive rule item is only supported in version 3 or later");
    }
    writer.writeByte(RULE_ITEM_NETWORK_IS_EXPENSIVE);
  }

  if (rule.network_is_constrained === true) {
    if (version < 3) {
      throw new Error("network_is_constrained rule item is only supported in version 3 or later");
    }
    writer.writeByte(RULE_ITEM_NETWORK_IS_CONSTRAINED);
  }

  const networkInterfaceAddress = normalizeNetworkInterfaceAddress(rule.network_interface_address);
  if (networkInterfaceAddress.length > 0) {
    if (version < 4) {
      throw new Error("network_interface_address rule item is only supported in version 4 or later");
    }
    writeRuleItemNetworkInterfaceAddress(writer, networkInterfaceAddress);
  }

  const defaultInterfaceAddress = normalizePrefixList(rule.default_interface_address, "default_interface_address");
  if (defaultInterfaceAddress.length > 0) {
    if (version < 4) {
      throw new Error("default_interface_address rule item is only supported in version 4 or later");
    }
    writeRuleItemPrefixList(writer, RULE_ITEM_DEFAULT_INTERFACE_ADDRESS, defaultInterfaceAddress);
  }

  const wifiSSID = normalizeStringList(rule.wifi_ssid, "wifi_ssid");
  if (wifiSSID.length > 0) writeRuleItemString(writer, RULE_ITEM_WIFI_SSID, wifiSSID);

  const wifiBSSID = normalizeStringList(rule.wifi_bssid, "wifi_bssid");
  if (wifiBSSID.length > 0) writeRuleItemString(writer, RULE_ITEM_WIFI_BSSID, wifiBSSID);

  writer.writeByte(RULE_ITEM_FINAL);
  writer.writeBool(rule.invert === true);
}

export function readDefaultRule(reader: BinaryReader): DefaultRule {
  const rule: DefaultRule = {};
  let lastItemType = 0;

  for (;;) {
    const itemType = reader.readByte();
    switch (itemType) {
      case RULE_ITEM_QUERY_TYPE:
        rule.query_type = toListable(readRuleItemUint16(reader).map(formatQueryType));
        break;
      case RULE_ITEM_NETWORK:
        rule.network = toListable(readRuleItemString(reader));
        break;
      case RULE_ITEM_DOMAIN: {
        const matcher = readDomainMatcher(reader);
        if (matcher.domain.length > 0) rule.domain = toListable(matcher.domain);
        if (matcher.domainSuffix.length > 0) rule.domain_suffix = toListable(matcher.domainSuffix);
        break;
      }
      case RULE_ITEM_DOMAIN_KEYWORD:
        rule.domain_keyword = toListable(readRuleItemString(reader));
        break;
      case RULE_ITEM_DOMAIN_REGEX:
        rule.domain_regex = toListable(readRuleItemString(reader));
        break;
      case RULE_ITEM_SOURCE_IP_CIDR:
        rule.source_ip_cidr = toListable(readRuleItemCIDR(reader));
        break;
      case RULE_ITEM_IP_CIDR:
        rule.ip_cidr = toListable(readRuleItemCIDR(reader));
        break;
      case RULE_ITEM_SOURCE_PORT:
        rule.source_port = toListable(readRuleItemUint16(reader));
        break;
      case RULE_ITEM_SOURCE_PORT_RANGE:
        rule.source_port_range = toListable(readRuleItemString(reader));
        break;
      case RULE_ITEM_PORT:
        rule.port = toListable(readRuleItemUint16(reader));
        break;
      case RULE_ITEM_PORT_RANGE:
        rule.port_range = toListable(readRuleItemString(reader));
        break;
      case RULE_ITEM_PROCESS_NAME:
        rule.process_name = toListable(readRuleItemString(reader));
        break;
      case RULE_ITEM_PROCESS_PATH:
        rule.process_path = toListable(readRuleItemString(reader));
        break;
      case RULE_ITEM_PROCESS_PATH_REGEX:
        rule.process_path_regex = toListable(readRuleItemString(reader));
        break;
      case RULE_ITEM_PACKAGE_NAME:
        rule.package_name = toListable(readRuleItemString(reader));
        break;
      case RULE_ITEM_PACKAGE_NAME_REGEX:
        rule.package_name_regex = toListable(readRuleItemString(reader));
        break;
      case RULE_ITEM_NETWORK_TYPE:
        rule.network_type = toListable(readRuleItemUint8(reader).map(formatInterfaceType));
        break;
      case RULE_ITEM_NETWORK_IS_EXPENSIVE:
        rule.network_is_expensive = true;
        break;
      case RULE_ITEM_NETWORK_IS_CONSTRAINED:
        rule.network_is_constrained = true;
        break;
      case RULE_ITEM_WIFI_SSID:
        rule.wifi_ssid = toListable(readRuleItemString(reader));
        break;
      case RULE_ITEM_WIFI_BSSID:
        rule.wifi_bssid = toListable(readRuleItemString(reader));
        break;
      case RULE_ITEM_ADGUARD_DOMAIN:
        throw new Error("adguard_domain matcher is not part of the JSON rule-set source format");
      case RULE_ITEM_NETWORK_INTERFACE_ADDRESS:
        rule.network_interface_address = readRuleItemNetworkInterfaceAddress(reader);
        break;
      case RULE_ITEM_DEFAULT_INTERFACE_ADDRESS:
        rule.default_interface_address = toListable(readRuleItemPrefixList(reader));
        break;
      case RULE_ITEM_FINAL: {
        const invert = reader.readBool();
        if (invert) rule.invert = true;
        return rule;
      }
      default:
        throw new Error(`unknown rule item type: ${itemType}, last type: ${lastItemType}`);
    }
    lastItemType = itemType;
  }
}
