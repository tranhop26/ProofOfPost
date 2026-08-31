import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CampaignStatePanel } from "./components/CampaignStatePanel";
import { AppRoutes } from "./App";
import { WalletProvider } from "./lib/wallet";

function renderRoute(path: string) {
  return render(<WalletProvider><MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AppRoutes /></MemoryRouter></WalletProvider>);
}

describe("campaign state rendering", () => {
  it.each([
    ["OPEN", "Awaiting creator"],
    ["UNRESOLVED", "Consensus unresolved"],
    ["PASSED", "Evidence passed"],
    ["FAILED", "Evidence failed"],
    ["PAID", "Creator paid"],
    ["REFUNDED", "Sponsor refunded"]
  ] as const)("renders %s without collapsing it into another state", (state, label) => {
    render(<CampaignStatePanel state={state} verdictReason="Evidence evaluated" />);
    expect(screen.getByRole("status")).toHaveTextContent(label);
  });
});

describe("application routes", () => {
  it("shows the real-contract configuration warning instead of fake campaigns", () => {
    renderRoute("/dashboard");
    expect(screen.getByText(/contract address is not configured/i)).toBeInTheDocument();
    expect(screen.queryByText(/demo campaign/i)).not.toBeInTheDocument();
  });

  it("renders a responsive creation form with simulated-value disclosure", () => {
    renderRoute("/campaigns/new");
    expect(screen.getByRole("heading", { name: /fund a campaign/i })).toBeInTheDocument();
    expect(screen.getAllByText(/simulated GEN/i)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Connect wallet first" })).toBeDisabled();
  });
});
