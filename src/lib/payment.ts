import {
  TransactionBuilder,
  Operation,
  Asset,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { HORIZON, NETWORK_PASSPHRASE, PHPC_ASSET } from "./stellar";

export interface FarePaymentParams {
  /** Passenger's wallet (sender). */
  sender: string;
  /** Driver's wallet (recipient). */
  destination: string;
  /** Fare amount in the configured asset. */
  amount: string;
}

/** Build an unsigned classic payment transaction. Returns base64 XDR. */
export async function buildFarePaymentXDR(
  params: FarePaymentParams,
): Promise<string> {
  const asset: Asset = PHPC_ASSET;
  const account = await HORIZON.loadAccount(params.sender);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: params.destination,
        asset,
        amount: params.amount,
      }),
    )
    .setTimeout(60)
    .build();

  return tx.toXDR();
}

/** Submit a signed XDR to Horizon. Returns the transaction hash. */
export async function submitSignedXDR(signedXdr: string): Promise<string> {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const res = await HORIZON.submitTransaction(tx);
  if ((res as unknown as { status?: string }).status === "ERROR") {
    throw new Error(
      `Submit rejected: ${JSON.stringify(
        (res as unknown as { errorResult?: unknown }).errorResult ?? res,
      )}`,
    );
  }
  return res.hash;
}

/** Poll until the transaction reaches finality. */
export async function pollTransaction(
  hash: string,
  timeoutMs = 60_000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await HORIZON.transactions().transaction(hash).call();
      if (res.successful) return;
      throw new Error("Transaction failed on-chain");
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 404) continue;
      throw e;
    }
  }
  throw new Error("Transaction timed out");
}

/** Build a changeTrust XDR for the configured payment asset. */
export async function buildAddTrustlineXDR(account: string): Promise<string> {
  const acct = await HORIZON.loadAccount(account);
  const tx = new TransactionBuilder(acct, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(Operation.changeTrust({ asset: PHPC_ASSET }))
    .setTimeout(60)
    .build();
  return tx.toXDR();
}
