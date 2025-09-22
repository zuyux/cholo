import { initSimnet, tx } from "@hirosystems/clarinet-sdk";
import { Cl, ClarityType } from "@stacks/transactions";
import { describe, it, expect, beforeEach } from "vitest";

let simnet: Awaited<ReturnType<typeof initSimnet>>;
let accounts: Map<string, string>;

const CONTRACT_NAME = "cholo";

beforeEach(async () => {
  simnet = await initSimnet();
  accounts = simnet.getAccounts();
});

describe("cholo", () => {
  it("User can mint tokens", async () => {
    const wallet1 = accounts.get("wallet_1")!;
    const result = await simnet.mineBlock([
      tx.callPublicFn(CONTRACT_NAME, "mint", [Cl.uint(1000), Cl.standardPrincipal(wallet1)], wallet1),
    ]);
    expect(result[0].result).toEqual(Cl.ok(Cl.bool(true)));
  });

  it("User can transfer tokens", async () => {
    const wallet1 = accounts.get("wallet_1")!;
    const wallet2 = accounts.get("wallet_2")!;
    await simnet.mineBlock([
      tx.callPublicFn(CONTRACT_NAME, "mint", [Cl.uint(1000), Cl.standardPrincipal(wallet1)], wallet1),
    ]);
    const result = await simnet.mineBlock([
      tx.callPublicFn(CONTRACT_NAME, "transfer", [Cl.uint(100), Cl.standardPrincipal(wallet1), Cl.standardPrincipal(wallet2), Cl.none()], wallet1),
    ]);
    expect(result[0].result).toEqual(Cl.ok(Cl.bool(true)));
  });

  it("User can batch transfer tokens", async () => {
    const wallet1 = accounts.get("wallet_1")!;
    const wallet2 = accounts.get("wallet_2")!;
    const wallet3 = accounts.get("wallet_3")!;
    await simnet.mineBlock([
      tx.callPublicFn(CONTRACT_NAME, "mint", [Cl.uint(1000), Cl.standardPrincipal(wallet1)], wallet1),
    ]);
    const recipients = [
      { amount: 100, sender: wallet1, to: wallet2, memo: null },
      { amount: 200, sender: wallet1, to: wallet3, memo: null },
    ];
    const result = await simnet.mineBlock([
      tx.callPublicFn(CONTRACT_NAME, "transfer-many", [
        Cl.list(
          recipients.map(r =>
            Cl.tuple({
              amount: Cl.uint(r.amount),
              sender: Cl.standardPrincipal(r.sender),
              to: Cl.standardPrincipal(r.to),
              memo: Cl.none(),
            })
          )
        ),
      ], wallet1),
    ]);
    expect(result[0].result.type).toBe(ClarityType.ResponseOk);
  });

  it("Fails if transfer amount exceeds balance", async () => {
    const wallet1 = accounts.get("wallet_1")!;
    const wallet2 = accounts.get("wallet_2")!;
    await simnet.mineBlock([
      tx.callPublicFn(CONTRACT_NAME, "mint", [Cl.uint(100), Cl.standardPrincipal(wallet1)], wallet1),
    ]);
    const result = await simnet.mineBlock([
      tx.callPublicFn(CONTRACT_NAME, "transfer", [Cl.uint(200), Cl.standardPrincipal(wallet1), Cl.standardPrincipal(wallet2), Cl.none()], wallet1),
    ]);
    expect(result[0].result.type).toBe(ClarityType.ResponseErr);
  });
});
