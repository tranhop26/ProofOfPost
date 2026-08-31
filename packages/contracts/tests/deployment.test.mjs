import test from "node:test";
import assert from "node:assert/strict";
import { normalizePrivateKey, validateManifest, validateNetwork } from "../scripts/deployment-lib.mjs";

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
