import type { TransactionStage } from "../lib/contract";
import { explorerTxUrl } from "../lib/genlayer";

const LABELS: Record<TransactionStage, string> = {
  SIGNING: "Waiting for wallet signature",
  PENDING: "Transaction pending",
  FINALIZED: "Transaction FINALIZED",
  SUCCESS: "Execution SUCCESS",
  READBACK: "Contract readback confirmed"
};

export function TransactionStatus({ stage, hash, error }: { stage: TransactionStage | null; hash?: string; error?: string }) {
  if (error) return <div className="transaction-status error" role="alert"><b>Transaction error</b><span>{error}</span></div>;
  if (!stage) return null;
  return <div className="transaction-status" role="status" aria-live="polite"><span className="spinner" /><b>{LABELS[stage]}</b>{hash && <a href={explorerTxUrl(hash)} target="_blank" rel="noreferrer">View transaction ↗</a>}</div>;
}
