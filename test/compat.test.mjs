import { expect, test } from "bun:test";

import { compile, decompile } from "../src/index.ts";

const exampleJSON = await Bun.file(new URL("./domain.json", import.meta.url)).json();
const exampleSRS = new Uint8Array(await Bun.file(new URL("./domain.srs", import.meta.url)).arrayBuffer());

test("decompiles provided domain.srs", () => {
  expect(decompile(exampleSRS)).toEqual(exampleJSON);
});

test("round-trips provided domain.json", () => {
  expect(decompile(compile(exampleJSON))).toEqual(exampleJSON);
});

test.skipIf(!hasSingBox())("compiled domain rule is readable by sing-box", async () => {
  const dir = tempDir();
  mkdir(dir);

  const srsPath = `${dir}/domain.srs`;
  const jsonPath = `${dir}/domain.json`;
  await Bun.write(srsPath, compile(exampleJSON));
  runSingBox(["rule-set", "decompile", "--output", jsonPath, srsPath]);
  expect(await Bun.file(jsonPath).json()).toEqual(exampleJSON);
});

test.skipIf(!hasSingBox())("random rule-sets are compatible with sing-box", async () => {
  const baseSeed = Bun.env.SRS_TS_TEST_SEED ?? crypto.randomUUID();
  const cases = Number(Bun.env.SRS_TS_RANDOM_CASES ?? 8);

  for (let index = 0; index < cases; index++) {
    const seed = `${baseSeed}:${index}`;
    try {
      await assertRuleSetCompatible(createRandomRuleSet(seed));
    } catch (error) {
      throw new Error(`random rule-set compatibility failed with seed ${seed}: ${messageOf(error)}`);
    }
  }
});

async function assertRuleSetCompatible(source) {
  const expected = decompile(compile(source));
  const dir = tempDir();
  mkdir(dir);

  const tsSRSPath = `${dir}/ts.srs`;
  const tsJSONPath = `${dir}/ts.json`;
  await Bun.write(tsSRSPath, compile(source));
  runSingBox(["rule-set", "decompile", "--output", tsJSONPath, tsSRSPath]);
  expect(await Bun.file(tsJSONPath).json()).toEqual(expected);

  const sourcePath = `${dir}/source.json`;
  const singBoxSRSPath = `${dir}/sing-box.srs`;
  await Bun.write(sourcePath, `${JSON.stringify(expected, null, 2)}\n`);
  runSingBox(["rule-set", "compile", "--output", singBoxSRSPath, sourcePath]);
  expect(decompile(new Uint8Array(await Bun.file(singBoxSRSPath).arrayBuffer()))).toEqual(expected);
}

function createRandomRuleSet(seed) {
  const random = seededRandom(seed);
  return {
    version: 2,
    rules: randomList(random, 2, 5, () => createRandomRule(random, 0))
  };
}

function createRandomRule(random, depth) {
  if (depth === 0 && randomBool(random, 0.25)) {
    const rule = {
      type: "logical",
      mode: randomPick(random, ["and", "or"]),
      rules: randomList(random, 2, 3, () => createRandomRule(random, depth + 1))
    };
    if (randomBool(random, 0.2)) rule.invert = true;
    return rule;
  }
  return createRandomDefaultRule(random);
}

function createRandomDefaultRule(random) {
  const fieldBuilders = [
    (rule) => {
      rule.network = randomListable(random, randomSubset(random, ["tcp", "udp"], 1, 2));
    },
    (rule) => {
      rule.domain = randomListable(random, randomDomains(random, 1, 3));
    },
    (rule) => {
      rule.domain_suffix = randomListable(random, randomDomains(random, 1, 3));
    },
    (rule) => {
      rule.domain_keyword = randomListable(random, randomList(random, 1, 3, () => `keyword-${randomInt(random, 1, 999)}`));
    },
    (rule) => {
      rule.domain_regex = randomListable(random, randomList(random, 1, 2, () => `^host-${randomInt(random, 1, 999)}\\.example\\.com$`));
    },
    (rule) => {
      rule.source_ip_cidr = randomListable(random, randomCIDRs(random, 1, 3));
    },
    (rule) => {
      rule.ip_cidr = randomListable(random, randomCIDRs(random, 1, 3));
    },
    (rule) => {
      rule.source_port = randomListable(random, randomPorts(random, 1, 3));
    },
    (rule) => {
      rule.source_port_range = randomListable(random, randomPortRanges(random, 1, 2));
    },
    (rule) => {
      rule.port = randomListable(random, randomPorts(random, 1, 3));
    },
    (rule) => {
      rule.port_range = randomListable(random, randomPortRanges(random, 1, 2));
    },
    (rule) => {
      rule.process_name = randomListable(random, randomList(random, 1, 3, () => `process-${randomInt(random, 1, 999)}`));
    },
    (rule) => {
      rule.process_path = randomListable(random, randomList(random, 1, 3, () => `/usr/bin/process-${randomInt(random, 1, 999)}`));
    },
    (rule) => {
      rule.package_name = randomListable(random, randomList(random, 1, 3, () => `com.example.app${randomInt(random, 1, 999)}`));
    },
    (rule) => {
      rule.wifi_ssid = randomListable(random, randomList(random, 1, 2, () => `wifi-${randomInt(random, 1, 999)}`));
    },
    (rule) => {
      rule.wifi_bssid = randomListable(random, randomList(random, 1, 2, () => randomMAC(random)));
    }
  ];

  const rule = {};
  for (const build of randomSubset(random, fieldBuilders, 2, 6)) {
    build(rule);
  }
  if (randomBool(random, 0.2)) rule.invert = true;
  return rule;
}

function seededRandom(seed) {
  let state = 0x811c9dc5;
  for (let index = 0; index < seed.length; index++) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 0x01000193);
  }
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function randomBool(random, probability) {
  return random() < probability;
}

function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

function randomPick(random, values) {
  return values[randomInt(random, 0, values.length - 1)];
}

function randomSubset(random, values, min, max) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = randomInt(random, 0, index);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, randomInt(random, min, max));
}

function randomList(random, min, max, createValue) {
  return Array.from({ length: randomInt(random, min, max) }, createValue);
}

function randomListable(random, values) {
  return values.length === 1 && randomBool(random, 0.5) ? values[0] : values;
}

function randomDomains(random, min, max) {
  const domains = new Set();
  while (domains.size < randomInt(random, min, max)) {
    domains.add(`${randomPick(random, ["alpha", "beta", "gamma", "delta"])}-${randomInt(random, 1, 999)}.example.com`);
  }
  return [...domains];
}

function randomCIDRs(random, min, max) {
  const cidrs = new Set();
  while (cidrs.size < randomInt(random, min, max)) {
    if (randomBool(random, 0.5)) {
      cidrs.add(`10.${randomInt(random, 0, 255)}.${randomInt(random, 0, 255)}.0/24`);
    } else {
      cidrs.add(`2001:db8:${randomInt(random, 0, 0xffff).toString(16)}::/48`);
    }
  }
  return [...cidrs];
}

function randomPorts(random, min, max) {
  const ports = new Set();
  while (ports.size < randomInt(random, min, max)) {
    ports.add(randomInt(random, 1, 65535));
  }
  return [...ports];
}

function randomPortRanges(random, min, max) {
  return randomList(random, min, max, () => {
    const from = randomInt(random, 1, 64000);
    return `${from}:${from + randomInt(random, 1, 1000)}`;
  });
}

function randomMAC(random) {
  return [0x02, 0x00, 0x00, randomInt(random, 0, 255), randomInt(random, 0, 255), randomInt(random, 0, 255)]
    .map((octet) => octet.toString(16).padStart(2, "0"))
    .join(":");
}

function hasSingBox() {
  return Bun.spawnSync(["sing-box", "version"], { stdout: "pipe", stderr: "pipe" }).success;
}

function mkdir(path) {
  const result = Bun.spawnSync(["mkdir", "-p", path], { stdout: "pipe", stderr: "pipe" });
  if (!result.success) {
    throw new Error(`mkdir failed\n${decode(result.stderr)}${decode(result.stdout)}`);
  }
}

function tempDir() {
  return `/tmp/srs-ts-${crypto.randomUUID()}`;
}

function runSingBox(args) {
  const result = Bun.spawnSync(["sing-box", ...args], { stdout: "pipe", stderr: "pipe" });
  if (!result.success) {
    throw new Error(`sing-box ${args.join(" ")} failed\n${decode(result.stderr)}${decode(result.stdout)}`);
  }
}

function decode(bytes) {
  return new TextDecoder().decode(bytes);
}
