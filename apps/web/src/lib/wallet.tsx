import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CHAIN, resetClients } from "./genlayer";

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

declare global {
  interface Window { ethereum?: EthereumProvider }
}

interface WalletState {
  address: `0x${string}` | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const STORAGE = "proof-of-post.wallet";
const WalletContext = createContext<WalletState | null>(null);

function savedAddress(): `0x${string}` | null {
  const value = localStorage.getItem(STORAGE);
  return value && /^0x[0-9a-fA-F]{40}$/.test(value) ? value as `0x${string}` : null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<`0x${string}` | null>(savedAddress);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    const provider = window.ethereum;
    if (!provider) {
      setError("Install or enable a browser wallet extension to continue.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
      const next = accounts?.[0];
      if (!next || !/^0x[0-9a-fA-F]{40}$/.test(next)) throw new Error("Wallet returned no valid account.");
      const chainId = await provider.request({ method: "eth_chainId" }) as string;
      if (Number.parseInt(chainId, 16) !== CHAIN.id) {
        try {
          await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${CHAIN.id.toString(16)}` }] });
        } catch {
          throw new Error(`Switch your wallet to ${CHAIN.name}.`);
        }
      }
      resetClients();
      setAddress(next as `0x${string}`);
      localStorage.setItem(STORAGE, next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Wallet connection failed.");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    resetClients();
    setAddress(null);
    setError(null);
    localStorage.removeItem(STORAGE);
  }, []);

  const value = useMemo(() => ({ address, connecting, error, connect, disconnect }), [address, connecting, error, connect, disconnect]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}
