import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletProvider } from "../lib/wallet";
import { ContractTransactionError, createCampaign } from "../lib/contract";
import { CreateCampaign } from "./CreateCampaign";

vi.mock("../lib/contract", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/contract")>();
  return { ...actual, createCampaign: vi.fn() };
});

describe("CreateCampaign", () => {
  beforeEach(() => {
    localStorage.setItem("proof-of-post.wallet", "0x1111111111111111111111111111111111111111");
    vi.mocked(createCampaign).mockReset();
  });

  it("keeps the submitted transaction explorer link visible after contract rejection", async () => {
    vi.mocked(createCampaign).mockImplementation(async (_input, options) => {
      const callbacks = options as typeof options & { onHash?: (hash: string) => void };
      callbacks.onStage?.("FINALIZED");
      callbacks.onHash?.("0xabc");
      throw new ContractTransactionError("Transaction finalized but contract execution failed.", "0xabc");
    });
    render(<WalletProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><CreateCampaign /></MemoryRouter></WalletProvider>);

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Creator wallet"), "0x2222222222222222222222222222222222222222");
    await user.type(screen.getByLabelText("Creator handle"), "ProofOfPost");
    await user.type(screen.getByLabelText("Campaign title"), "Live proof");
    await user.type(screen.getByLabelText("Public evidence origin"), "https://proof-of-post.vercel.app");
    await user.type(screen.getByLabelText("Brief"), "Publish the frozen campaign evidence.");
    await user.type(screen.getByLabelText("Decision rubric"), "Verify identity, content, disclosure, and time.");
    await user.type(screen.getByLabelText("Accept by"), "2026-09-01T09:00");
    await user.type(screen.getByLabelText("Submit by"), "2026-09-01T10:00");
    await user.type(screen.getByLabelText(/Escrow amount/), "1");
    await user.click(screen.getByLabelText(/I understand the terms/));
    await user.click(screen.getByRole("button", { name: "Review and fund escrow" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/contract execution failed/i);
    expect(screen.getByRole("link", { name: /view transaction/i })).toHaveAttribute(
      "href",
      "https://explorer-studio.genlayer.com/tx/0xabc"
    );
  });
});
