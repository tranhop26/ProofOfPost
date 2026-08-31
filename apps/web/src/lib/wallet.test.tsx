import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletProvider, useWallet } from "./wallet";

function Probe() {
  const wallet = useWallet();
  return (
    <div>
      <span>{wallet.address ?? "disconnected"}</span>
      <span>{wallet.error ?? "no error"}</span>
      <button onClick={() => void wallet.connect()}>Connect</button>
      <button onClick={wallet.disconnect}>Disconnect</button>
    </div>
  );
}

describe("WalletProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    delete (window as Window & { ethereum?: unknown }).ethereum;
  });

  it("starts disconnected and reports a missing injected wallet", async () => {
    render(<WalletProvider><Probe /></WalletProvider>);
    expect(screen.getByText("disconnected")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(screen.getByText(/wallet extension/i)).toBeInTheDocument();
  });

  it("connects only to the account returned by the injected provider", async () => {
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === "eth_requestAccounts") return ["0x1111111111111111111111111111111111111111"];
      if (method === "eth_chainId") return "0xf22f";
      return null;
    });
    (window as Window & { ethereum?: unknown }).ethereum = { request };
    render(<WalletProvider><Probe /></WalletProvider>);
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(screen.getByText("0x1111111111111111111111111111111111111111")).toBeInTheDocument();
    expect(localStorage.getItem("proof-of-post.wallet")).toBe("0x1111111111111111111111111111111111111111");
  });

  it("does not preserve identity after disconnect", async () => {
    localStorage.setItem("proof-of-post.wallet", "0x1111111111111111111111111111111111111111");
    render(<WalletProvider><Probe /></WalletProvider>);
    await userEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    expect(screen.getByText("disconnected")).toBeInTheDocument();
    expect(localStorage.getItem("proof-of-post.wallet")).toBeNull();
  });
});
