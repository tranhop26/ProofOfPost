import { beforeEach, describe, expect, it } from "vitest";
import { readClient, requireConnectedAddress, resetClients } from "./genlayer";

describe("GenLayer client separation", () => {
  beforeEach(() => {
    localStorage.clear();
    resetClients();
  });

  it("creates an accountless read client without persisting a key", () => {
    expect(readClient()).toBeDefined();
    expect(localStorage.length).toBe(0);
  });

  it("rejects a disconnected or malformed write identity", () => {
    expect(() => requireConnectedAddress(null)).toThrow(/connect/i);
    expect(() => requireConnectedAddress("0x123")).toThrow(/address/i);
    expect(requireConnectedAddress("0x1111111111111111111111111111111111111111")).toBe("0x1111111111111111111111111111111111111111");
  });
});
