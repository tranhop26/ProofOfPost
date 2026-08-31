import { createClient } from "genlayer-js";
import { studionet, testnetAsimov } from "genlayer-js/chains";

export type NetworkName = "studionet" | "testnet-asimov";

export const NETWORK: NetworkName = import.meta.env.VITE_GENLAYER_NETWORK === "testnet-asimov" ? "testnet-asimov" : "studionet";
export const CHAIN = NETWORK === "testnet-asimov" ? testnetAsimov : studionet;
export const CONTRACT_ADDRESS = (import.meta.env.VITE_PROOF_OF_POST_ADDRESS ?? "") as `0x${string}`;
export const CONTRACT_CONFIGURED = /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS);

let readonlyClient: ReturnType<typeof createClient> | null = null;
const writeClients = new Map<string, ReturnType<typeof createClient>>();

export function readClient(): ReturnType<typeof createClient> {
  if (!readonlyClient) readonlyClient = createClient({ chain: CHAIN });
  return readonlyClient;
}

export function requireConnectedAddress(value: string | null): `0x${string}` {
  if (!value) throw new Error("Connect a wallet before submitting a transaction.");
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error("Connected wallet address is invalid.");
  return value as `0x${string}`;
}

export function writeClient(address: string | null): ReturnType<typeof createClient> {
  const connected = requireConnectedAddress(address);
  const cached = writeClients.get(connected.toLowerCase());
  if (cached) return cached;
  const client = createClient({ chain: CHAIN, account: connected });
  writeClients.set(connected.toLowerCase(), client);
  return client;
}

export function resetClients(): void {
  readonlyClient = null;
  writeClients.clear();
}

const EXPLORER = NETWORK === "studionet" ? "https://explorer-studio.genlayer.com" : "https://explorer-asimov.genlayer.com";

export function explorerTxUrl(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${EXPLORER}/address/${address}`;
}
