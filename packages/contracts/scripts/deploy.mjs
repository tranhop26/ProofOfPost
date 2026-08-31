#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAccount, createClient } from 'genlayer-js';
import { studionet, testnetAsimov } from 'genlayer-js/chains';
import { extractContractAddress, normalizePrivateKey, validateManifest, validateNetwork } from './deployment-lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const contractPath = join(here, '..', 'proof_of_post.py');
const network = validateNetwork(process.argv[2] ?? 'studionet');
const dryRun = process.argv.includes('--dry-run');
const key = normalizePrivateKey(process.env.DEPLOYER_PRIVATE_KEY);
const account = createAccount(key);
const chain = network === 'testnet-asimov' ? testnetAsimov : studionet;
const source = readFileSync(contractPath, 'utf8');
const sourceHash = `sha256:${createHash('sha256').update(source).digest('hex')}`;

console.log(JSON.stringify({ action: dryRun ? 'DEPLOY_PREFLIGHT_ONLY' : 'DEPLOY_CONTRACT', project: 'ProofOfPost', network, chainId: chain.id, deployer: account.address, sourceHash, classification: 'INTENTIONALLY_FROZEN' }, null, 2));
if (dryRun) process.exit(0);
if (process.env.CONFIRM_DEPLOY !== `ProofOfPost:${network}:${account.address}`) {
  throw new Error('Action-time deployment confirmation is missing or does not match this wallet/network.');
}

const client = createClient({ chain, account });
try { await client.initializeConsensusSmartContract(); } catch { if (network !== 'studionet') throw new Error('Could not initialize the consensus contract.'); }
const deploymentTransaction = await client.deployContract({ code: source, args: [] });
const receipt = await client.waitForTransactionReceipt({ hash: deploymentTransaction, status: 'FINALIZED', retries: 150, interval: 3000 });
const contractAddress = extractContractAddress(receipt);
const manifest = validateManifest({ schemaVersion: 1, project: 'ProofOfPost', network, chainId: chain.id, classification: 'INTENTIONALLY_FROZEN', contractAddress, deploymentTransaction, deployer: account.address, sourceHash, deployedAt: new Date().toISOString(), constructorArgs: [] });
mkdirSync(join(root, 'deployments'), { recursive: true });
const manifestPath = join(root, 'deployments', `${network}-${contractAddress.toLowerCase()}.json`);
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
console.log(`Manifest written: ${manifestPath}`);
