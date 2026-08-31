#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createAccount, createClient } from 'genlayer-js';
import { CalldataAddress } from 'genlayer-js/types';
import { studionet, testnetAsimov } from 'genlayer-js/chains';
import { normalizePrivateKey, validateManifest } from './deployment-lib.mjs';

const manifestPath = process.argv[2];
if (!manifestPath) throw new Error('Usage: node e2e.mjs <manifest.json>');
const manifest = validateManifest(JSON.parse(readFileSync(manifestPath, 'utf8')));
const sponsor = createAccount(normalizePrivateKey(process.env.SPONSOR_PRIVATE_KEY));
const creator = createAccount(normalizePrivateKey(process.env.CREATOR_PRIVATE_KEY));
if (sponsor.address.toLowerCase() === creator.address.toLowerCase()) throw new Error('Sponsor and creator wallets must differ.');
if (process.env.CONFIRM_LIVE_E2E !== `ProofOfPost:e2e:${manifest.contractAddress}`) throw new Error('Action-time live E2E confirmation is missing.');
const evidenceUrl = String(process.env.EVIDENCE_URL ?? '');
const allowedOrigin = new URL(evidenceUrl).origin;
const chain = manifest.network === 'testnet-asimov' ? testnetAsimov : studionet;
const sponsorClient = createClient({ chain, account: sponsor });
const creatorClient = createClient({ chain, account: creator });
const now = Math.floor(Date.now() / 1000);
const toAddress = (hex) => new CalldataAddress(Uint8Array.from(hex.slice(2).match(/.{2}/g).map((byte) => Number.parseInt(byte, 16))));
const proof = [];

async function write(client, actor, method, args, expected, value = 0n) {
  const hash = await client.writeContract({ address: manifest.contractAddress, functionName: method, args, value });
  const receipt = await client.waitForTransactionReceipt({ hash, status: 'FINALIZED', retries: 150, interval: 3000 });
  const execution = String(receipt?.data?.execution_result ?? receipt?.execution_result ?? '').toUpperCase();
  if (execution !== 'SUCCESS') throw new Error(`${method} finalized without SUCCESS`);
  const campaignId = Number(await sponsorClient.readContract({ address: manifest.contractAddress, functionName: 'get_campaign_count', args: [] }));
  const readback = await sponsorClient.readContract({ address: manifest.contractAddress, functionName: 'get_campaign', args: [campaignId] });
  if (readback?.state !== expected) throw new Error(`${method} readback ${readback?.state} != ${expected}`);
  proof.push({ actor, action: method, contractMethod: method, transactionHash: hash, finalized: true, execution: 'SUCCESS', readback: readback.state });
  return campaignId;
}

const campaignId = await write(sponsorClient, sponsor.address, 'create_campaign', [toAddress(creator.address), 'ProofOfPost live verification', 'Publish a public page naming ProofOfPost and the campaign purpose.', 'The page must match the creator handle, name ProofOfPost, describe sponsored verification, and be published before the deadline.', allowedOrigin, '@proof-creator', now + 3600, now + 7200], 'OPEN', 10n ** 15n);

const unauthorizedHash = await sponsorClient.writeContract({ address: manifest.contractAddress, functionName: 'accept_campaign', args: [campaignId] });
const unauthorizedReceipt = await sponsorClient.waitForTransactionReceipt({ hash: unauthorizedHash, status: 'FINALIZED', retries: 150, interval: 3000 });
const unauthorizedExecution = String(unauthorizedReceipt?.data?.execution_result ?? unauthorizedReceipt?.execution_result ?? '').toUpperCase();
if (unauthorizedExecution === 'SUCCESS') throw new Error('Critical unauthorized acceptance branch unexpectedly succeeded.');
const unauthorizedReadback = await sponsorClient.readContract({ address: manifest.contractAddress, functionName: 'get_campaign', args: [campaignId] });
if (unauthorizedReadback?.state !== 'OPEN') throw new Error(`Unauthorized acceptance changed state to ${unauthorizedReadback?.state}.`);
proof.push({ actor: sponsor.address, action: 'unauthorized accept', contractMethod: 'accept_campaign', transactionHash: unauthorizedHash, finalized: true, execution: unauthorizedExecution || 'ERROR', readback: unauthorizedReadback.state });

await write(creatorClient, creator.address, 'accept_campaign', [campaignId], 'ACCEPTED');
await write(creatorClient, creator.address, 'submit_evidence', [campaignId, evidenceUrl, now], 'SUBMITTED');
const resolver = createClient({ chain, account: sponsor });
const resolutionHash = await resolver.writeContract({ address: manifest.contractAddress, functionName: 'resolve_campaign', args: [campaignId] });
const resolutionReceipt = await resolver.waitForTransactionReceipt({ hash: resolutionHash, status: 'FINALIZED', retries: 150, interval: 3000 });
const resolutionExecution = String(resolutionReceipt?.data?.execution_result ?? resolutionReceipt?.execution_result ?? '').toUpperCase();
if (resolutionExecution !== 'SUCCESS') throw new Error('resolve_campaign finalized without SUCCESS.');
const resolved = await sponsorClient.readContract({ address: manifest.contractAddress, functionName: 'get_campaign', args: [campaignId] });
if (resolved?.state !== 'PASSED') throw new Error(`Live happy path requires PASSED readback; received ${resolved?.state}.`);
proof.push({ actor: sponsor.address, action: 'resolve evidence', contractMethod: 'resolve_campaign', transactionHash: resolutionHash, finalized: true, execution: resolutionExecution, readback: resolved.state });
await write(sponsorClient, sponsor.address, 'settle', [campaignId], 'PAID');
console.log(JSON.stringify({ contractAddress: manifest.contractAddress, campaignId, proof }, null, 2));
