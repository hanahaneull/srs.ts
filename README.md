# srs.ts

[![npm version](https://badge.fury.io/js/srs.ts.svg?icon=si%3Anpm&icon_color=%23c061cb)](https://www.npmjs.com/package/srs.ts) ![GitHub License](https://img.shields.io/github/license/hanahaneull/srs.ts)


TypeScript implementation of the [sing-box](https://github.com/SagerNet/sing-box) binary rule-set (`.srs`) compiler and decompiler.

This project is a small JavaScript/TypeScript library for working with sing-box SRS files without running the Go `sing-box` binary. It mirrors the binary rule-set format implemented by [sing-box](https://github.com/SagerNet/sing-box), accepts the same plain rule-set JSON shape, and returns `Uint8Array` data that can be used in modern JavaScript runtimes.

It is not a TypeScript port of the full [sing-box](https://github.com/SagerNet/sing-box) proxy platform. It does not load configs, match traffic, manage remote rule sets, or implement route/DNS behavior. It only serializes and deserializes plain headless rule sets.

## Features

- Compile sing-box plain rule-set JSON to `.srs` binary bytes.
- Decompile `.srs` binary bytes back to plain rule-set JSON.
- Support sing-box rule-set versions 1 through 5.
- Support default and logical headless rules.
- Use the sing-box SRS magic header, zlib payload, varint encoding, succinct domain matcher format, and IP set encoding.
- Run in browsers, Bun, Deno, workers, Node-compatible bundlers, and other runtimes that support standard `Uint8Array` APIs.

## Supported Rule Items

Default rules support these JSON fields:

- `query_type`
- `network`
- `domain`
- `domain_suffix`
- `domain_keyword`
- `domain_regex`
- `source_ip_cidr`
- `ip_cidr`
- `source_port`
- `source_port_range`
- `port`
- `port_range`
- `process_name`
- `process_path`
- `process_path_regex`
- `package_name`
- `package_name_regex`
- `network_type`
- `network_is_expensive`
- `network_is_constrained`
- `network_interface_address`
- `default_interface_address`
- `wifi_ssid`
- `wifi_bssid`
- `invert`

Logical rules support `type: "logical"`, `mode: "and" | "or"`, nested `rules`, and `invert`.

Version-gated fields follow sing-box's binary format rules:

- `network_type`, `network_is_expensive`, and `network_is_constrained` require version 3 or later.
- `network_interface_address` and `default_interface_address` require version 4 or later.
- `package_name_regex` requires version 5 or later.

The binary-only AdGuard matcher item is intentionally unsupported and will throw if encountered, because sing-box does not expose it as a normal source JSON field.

## Usage

```ts
import { compile, decompile } from "srs.ts";

const ruleSet = {
  version: 4,
  rules: [
    {
      domain: ["example.com"],
      domain_suffix: ["example.org"],
      ip_cidr: ["10.0.0.0/24"]
    },
    {
      type: "logical",
      mode: "and",
      rules: [{ network: "tcp" }, { port: [80, 443] }]
    }
  ]
};

const srsBytes = compile(ruleSet);
const decoded = decompile(srsBytes);
```

`compile()` returns a `Uint8Array` containing the complete `.srs` file contents. `decompile()` accepts a `Uint8Array` containing `.srs` bytes and returns plain rule-set JSON.

## CLI

The package also installs an `srs.ts` command for use with `npx`:

```sh
npx srs.ts compile rules.srs
npx srs.ts decompile rules.json
```

You can pass an explicit output path as a second argument:

```sh
npx srs.ts compile source.json output.srs
npx srs.ts decompile source.srs output.json
```

## API

```ts
function compile(ruleSet: PlainRuleSet): Uint8Array;
function decompile(data: Uint8Array): PlainRuleSet;
```

The package also exports TypeScript types for `PlainRuleSet`, `Rule`, `DefaultRule`, `LogicalRule`, and related helper shapes.

## Development

Install dependencies with Bun:

```sh
bun install
```

Run tests:

```sh
bun test
```

Build the package:

```sh
bun run build
```

If `sing-box` is available on `PATH`, the tests also perform cross-compatibility checks with `sing-box rule-set compile` and `sing-box rule-set decompile`.
