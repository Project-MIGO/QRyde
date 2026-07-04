// Stellar SDK setup.
//
// Network, RPC/Horizon servers, and the payment asset are all driven by env
// vars (see `.env.example`). Defaults target Stellar testnet.

import { Horizon, rpc, Networks, Asset } from "@stellar/stellar-sdk";

const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org";

const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";

const PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? Networks.TESTNET;

const ASSET_CODE = process.env.NEXT_PUBLIC_PAYMENT_ASSET_CODE ?? "";
const ASSET_ISSUER = process.env.NEXT_PUBLIC_PAYMENT_ASSET_ISSUER ?? "";

export const NETWORK_PASSPHRASE = PASSPHRASE;
export const HORIZON = new Horizon.Server(HORIZON_URL);
export const RPC = new rpc.Server(RPC_URL);

export const FRIENDBOT_URL = "https://friendbot.stellar.org";

/** Stellar Explorer URL for a given transaction hash. */
export function explorerTxUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

/** Stellar Explorer URL for an account. */
export function explorerAccountUrl(address: string): string {
  return `https://stellar.expert/explorer/testnet/account/${address}`;
}

/**
 * The asset the demo settles fares in.
 *
 * If NEXT_PUBLIC_PAYMENT_ASSET_CODE + NEXT_PUBLIC_PAYMENT_ASSET_ISSUER are set,
 * this is the configured credit asset (e.g. PHPC). Otherwise we fall back to
 * native XLM so the demo works out-of-the-box without a real PHPC issuer on
 * testnet.
 */
export const PHPC_ASSET: Asset =
  ASSET_CODE && ASSET_ISSUER ? new Asset(ASSET_CODE, ASSET_ISSUER) : Asset.native();

export const PHPC_DISPLAY_CODE = ASSET_CODE || "XLM";
export const PHPC_HAS_TRUSTLINE = Boolean(ASSET_CODE && ASSET_ISSUER);

/** Fund a testnet account via Friendbot (~10,000 XLM). 400 = already funded. */
export async function fundTestnetAccount(publicKey: string): Promise<void> {
  const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`);
  if (!res.ok && res.status !== 400) {
    throw new Error("Friendbot funding failed. Try again in a moment.");
  }
}
