// Real Stellar payment service.
//
// Builds, signs (via Freighter), submits (via Horizon), and polls a classic
// payment for the fare. The asset used is whatever `PHPC_ASSET` resolves to
// (configured via env, falls back to native XLM for the demo).
//
// All heavy work happens in `src/lib/*`. This file is just the ride-flow
// orchestration layer that returns a `RideReceipt`-shaped result.

import type { DriverInfo } from "./types";
import { buildFarePaymentXDR, pollTransaction, submitSignedXDR } from "@/lib/payment";
import { HORIZON } from "@/lib/stellar";

export interface PaymentResult {
  txHash: string;
  gasXlm: number;
  ledger?: number;
}

export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentError";
  }
}

export class PaymentTimeoutError extends PaymentError {
  constructor() {
    super("Stellar transaction timed out. Please try again.");
    this.name = "PaymentTimeoutError";
  }
}

export class PaymentRejectedError extends PaymentError {}

/**
 * Build, sign (via Freighter), submit, and confirm a fare payment to the driver.
 * `signXdr` is injected so the React layer can plumb in the Freighter hook
 * (keeps this module browser-environment-agnostic).
 */
export async function submitPayment(
  sender: string,
  driver: DriverInfo,
  amountPhpc: number,
  signXdr: (unsignedXdr: string) => Promise<string>,
): Promise<PaymentResult> {
  const xdr = await buildFarePaymentXDR({
    sender,
    destination: driver.driverPublicKey,
    amount: amountPhpc.toFixed(7),
  });

  let signedXdr: string;
  try {
    signedXdr = await signXdr(xdr);
  } catch (e) {
    throw new PaymentRejectedError(
      e instanceof Error ? e.message : "Wallet rejected the transaction",
    );
  }

  let txHash: string;
  try {
    txHash = await submitSignedXDR(signedXdr);
  } catch (e) {
    throw new PaymentError(
      e instanceof Error ? e.message : "Horizon rejected the transaction",
    );
  }

  try {
    await pollTransaction(txHash);
  } catch {
    throw new PaymentTimeoutError();
  }

  // Fetch the resulting transaction to read the actual fee paid (in XLM).
  let gasXlm = 0.00001;
  let ledger: number | undefined;
  try {
    const tx = await HORIZON.transactions().transaction(txHash).call();
    gasXlm = parseFloat(String(tx.fee_charged ?? tx.max_fee ?? "100")) / 10_000_000;
  } catch {
    // Non-fatal - we already have confirmation, just can't show exact fee.
  }

  return { txHash, gasXlm, ledger };
}
