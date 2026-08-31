#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from 'genlayer-js';
import { studionet, testnetAsimov } from 'genlayer-js/chains';
import { validateManifest } from './deployment-lib.mjs';

const manifestPath = process.argv[2];
if (!manifestPath) throw new Error('Usage: node readback.mjs <deployment-manifest.json>');
const manifest = validateManifest(JSON.parse(readFileSync(manifestPath, 'utf8')));
const chain = manifest.network === 'testnet-asimov' ? testnetAsimov : studionet;
const client = createClient({ chain });
const code = await client.getContractCode({ address: manifest.contractAddress });
const text = typeof code === 'string' ? code : new TextDecoder().decode(code);
const hash = `sha256:${createHash('sha256').update(text).digest('hex')}`;
if (hash !== manifest.sourceHash) throw new Error(`Deployed source mismatch: ${hash} != ${manifest.sourceHash}`);
const schema = await client.getContractSchema({ address: manifest.contractAddress });
const accounting = await client.readContract({ address: manifest.contractAddress, functionName: 'get_accounting', args: [] });
console.log(JSON.stringify({ verified: true, contractAddress: manifest.contractAddress, deploymentTransaction: manifest.deploymentTransaction, sourceHash: hash, schema, accounting }, null, 2));
