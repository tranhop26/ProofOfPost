export interface ContractClient {
  writeContract(request: Record<string, unknown>): Promise<string>;
  waitForTransactionReceipt(request: Record<string, unknown>): Promise<unknown>;
}

export interface ContractWriteRequest {
  address: `0x${string}`;
  functionName: string;
  args: unknown[];
  value?: bigint;
}

export interface ConfirmOptions {
  readbackRetries?: number;
  readbackIntervalMs?: number;
}

export interface ConfirmedWrite<T> {
  hash: string;
  finalized: true;
  execution: "SUCCESS";
  readback: T;
}

function receiptRecord(receipt: unknown): Record<string, unknown> {
  if (!receipt || typeof receipt !== "object") throw new Error("Finalization receipt is missing.");
  return receipt as Record<string, unknown>;
}

function nested(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function executionResult(receipt: Record<string, unknown>): string {
  const value = nested(receipt, "data").execution_result ?? nested(receipt, "txDataDecoded").execution_result ?? receipt.execution_result;
  return String(value ?? "").toUpperCase();
}

function finalized(receipt: Record<string, unknown>): boolean {
  const status = String(receipt.statusName ?? receipt.status ?? "").toUpperCase();
  return status === "FINALIZED";
}

const delay = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export async function writeAndConfirm<T>(
  client: ContractClient,
  request: ContractWriteRequest,
  readback: () => Promise<T>,
  expected: (value: T) => boolean,
  options: ConfirmOptions = {}
): Promise<ConfirmedWrite<T>> {
  const hash = await client.writeContract(request as unknown as Record<string, unknown>);
  const receipt = receiptRecord(await client.waitForTransactionReceipt({ hash, status: "FINALIZED", retries: 100, interval: 3000 }));
  if (!finalized(receipt)) throw new Error("Transaction did not reach FINALIZED state.");
  if (executionResult(receipt) !== "SUCCESS") throw new Error("Transaction finalized but contract execution failed.");

  const retries = options.readbackRetries ?? 8;
  const interval = options.readbackIntervalMs ?? 750;
  let latest: T | undefined;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    latest = await readback();
    if (expected(latest)) return { hash, finalized: true, execution: "SUCCESS", readback: latest };
    if (attempt + 1 < retries && interval > 0) await delay(interval);
  }
  throw new Error("Transaction succeeded but authoritative contract readback is stale.");
}

export function validCampaignId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
