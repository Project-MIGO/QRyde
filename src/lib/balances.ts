import { HORIZON, PHPC_DISPLAY_CODE, PHPC_ASSET } from "./stellar";

export interface Balances {
  xlm: string;
  // Custom asset balance keyed by display code (e.g. "PHPC", "USDC").
  custom: string;
  customCode: string;
  funded: boolean;
  hasTrustline: boolean;
}

export async function fetchBalances(publicKey: string): Promise<Balances> {
  try {
    const account = await HORIZON.loadAccount(publicKey);
    let xlm = "0";
    let custom = "0";
    let hasTrustline = false;

    for (const b of account.balances) {
      if (b.asset_type === "native") {
        xlm = parseFloat(b.balance).toFixed(2);
      } else if (b.asset_type === "credit_alphanum4" || b.asset_type === "credit_alphanum12") {
        // Native XLM fallback has no asset_code/asset_issuer; only match the
        // configured asset if both fields are present.
        if (
          typeof b.asset_code === "string" &&
          typeof b.asset_issuer === "string" &&
          b.asset_code === PHPC_ASSET.code &&
          b.asset_issuer === PHPC_ASSET.issuer
        ) {
          custom = parseFloat(b.balance).toFixed(2);
          hasTrustline = true;
        }
      }
    }

    return {
      xlm,
      custom,
      customCode: PHPC_DISPLAY_CODE,
      funded: true,
      hasTrustline,
    };
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status === 404 || (e as { name?: string })?.name === "NotFoundError") {
      return { xlm: "0", custom: "0", customCode: PHPC_DISPLAY_CODE, funded: false, hasTrustline: false };
    }
    throw e;
  }
}
