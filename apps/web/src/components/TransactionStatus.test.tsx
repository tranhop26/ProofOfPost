import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TransactionStatus } from "./TransactionStatus";

describe("TransactionStatus", () => {
  it("keeps the explorer link visible when a finalized contract transaction fails", () => {
    render(<TransactionStatus stage="FINALIZED" hash="0xabc" error="Contract execution failed." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Contract execution failed.");
    expect(screen.getByRole("link", { name: /view transaction/i })).toHaveAttribute(
      "href",
      "https://explorer-studio.genlayer.com/tx/0xabc"
    );
  });
});
