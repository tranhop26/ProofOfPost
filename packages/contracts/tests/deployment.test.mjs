import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalContractSource, normalizePrivateKey, validateManifest, validateNetwork } from "../scripts/deployment-lib.mjs";

test("deployment rejects unknown networks", () => {
  assert.throws(() => validateNetwork("mainnet"), /network/i);
  assert.equal(validateNetwork("studionet"), "studionet");
});

test("private key validation never substitutes a different wallet", () => {
  assert.equal(normalizePrivateKey("a".repeat(64)), `0x${"a".repeat(64)}`);
  assert.throws(() => normalizePrivateKey(""), /required/i);
  assert.throws(() => normalizePrivateKey("secret"), /64 hex/i);
});

test("manifest rejects placeholders and incomplete deployment evidence", () => {
  const valid = {
    schemaVersion: 1, project: "ProofOfPost", network: "studionet", chainId: 61999,
    classification: "INTENTIONALLY_FROZEN", contractAddress: `0x${"1".repeat(40)}`,
    deploymentTransaction: `0x${"2".repeat(64)}`, deployer: `0x${"3".repeat(40)}`,
    sourceHash: `sha256:${"4".repeat(64)}`, deployedAt: "2026-08-31T00:00:00.000Z", constructorArgs: []
  };
  assert.doesNotThrow(() => validateManifest(valid));
  assert.throws(() => validateManifest({ ...valid, contractAddress: "0x0000000000000000000000000000000000000000" }), /address/i);
  assert.throws(() => validateManifest({ ...valid, deploymentTransaction: "NOT_DEPLOYED" }), /transaction/i);
});

test("live evidence requires a passed verdict, terminal payout, and a real rejected transaction hash", () => {
  const source = readFileSync(new URL("../scripts/e2e.mjs", import.meta.url), "utf8");
  assert.match(source, /resolved\?\.state !== ['"]PASSED['"]/);
  assert.match(source, /['"]settle['"].*['"]PAID['"]/s);
  assert.match(source, /transactionHash: unauthorizedHash/);
});

test("readback passes contract addresses directly to the GenLayer SDK", () => {
  const source = readFileSync(new URL("../scripts/readback.mjs", import.meta.url), "utf8");
  assert.match(source, /getContractCode\(manifest\.contractAddress\)/);
  assert.match(source, /getContractSchema\(manifest\.contractAddress\)/);
  assert.doesNotMatch(source, /getContract(?:Code|Schema)\(\{\s*address:/);
});

test("source verification ignores only editor newline normalization", () => {
  const repository = "line one\nline two\n";
  const studio = "line one\r\nline two\r\n\r\n";
  assert.equal(canonicalContractSource(studio), canonicalContractSource(repository));
  assert.notEqual(canonicalContractSource("line one\nchanged\n"), canonicalContractSource(repository));
});

test("Vercel output directory is relative to the configured apps/web project root", () => {
  const config = JSON.parse(readFileSync(new URL("../../../vercel.json", import.meta.url), "utf8"));
  assert.equal(config.outputDirectory, "dist");
});
