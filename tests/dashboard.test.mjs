import { test } from "node:test";
import assert from "node:assert/strict";
import { CrossChainDashboard } from "../dist/index.js";

const ONE_ETHER = 10n ** 18n;

test("1. Timelock safety status classification", () => {
  const dash = new CrossChainDashboard(300); // 300s safety margin
  const now = 10000;

  assert.equal(dash.classifyTimelockSafety(10400, now), "SAFE");       // 400s >= 300s
  assert.equal(dash.classifyTimelockSafety(10200, now), "MARGINAL");   // 200s < 300s and >= 120s
  assert.equal(dash.classifyTimelockSafety(10050, now), "DANGEROUS");  // 50s < 120s
  assert.equal(dash.classifyTimelockSafety(9999, now), "EXPIRED");     // past
  assert.equal(dash.classifyTimelockSafety(10000, now), "EXPIRED");    // exact boundary
});

test("2. Swap phase transitions & confirmation depth evaluation", () => {
  const dash = new CrossChainDashboard(300);
  const now = 10000;

  // Pending confirmation (source 2 < 12, dest 12 >= 12)
  const view1 = dash.evaluateSwapStatus({
    swapId: "swap_1",
    initiator: "0xAlice",
    recipient: "0xBob",
    sourceChainId: 1,
    destChainId: 137,
    amount: 100n * ONE_ETHER,
    hashlock: "0xabcdef",
    timelock: 10600,
    claimed: false,
    refunded: false,
    sourceConfirmations: 2,
    destConfirmations: 12,
    requiredConfirmations: 12
  }, now);
  assert.equal(view1.phase, "PENDING_CONFIRMATION");
  assert.equal(view1.timelockStatus, "SAFE");
  assert.equal(view1.remainingSeconds, 600);

  // Active (both 12 >= 12)
  const view2 = dash.evaluateSwapStatus({
    swapId: "swap_2",
    initiator: "0xAlice",
    recipient: "0xBob",
    sourceChainId: 1,
    destChainId: 137,
    amount: 100n * ONE_ETHER,
    hashlock: "0xabcdef",
    timelock: 10600,
    claimed: false,
    refunded: false,
    sourceConfirmations: 15,
    destConfirmations: 12,
    requiredConfirmations: 12
  }, now);
  assert.equal(view2.phase, "ACTIVE");

  // Claimed takes precedence
  const view3 = dash.evaluateSwapStatus({
    swapId: "swap_3",
    initiator: "0xAlice",
    recipient: "0xBob",
    sourceChainId: 1,
    destChainId: 137,
    amount: 100n * ONE_ETHER,
    hashlock: "0xabcdef",
    timelock: 10600,
    claimed: true,
    refunded: false,
    sourceConfirmations: 15,
    destConfirmations: 12,
    requiredConfirmations: 12
  }, now);
  assert.equal(view3.phase, "CLAIMED");

  // Refunded
  const view4 = dash.evaluateSwapStatus({
    swapId: "swap_4",
    initiator: "0xAlice",
    recipient: "0xBob",
    sourceChainId: 1,
    destChainId: 137,
    amount: 100n * ONE_ETHER,
    hashlock: "0xabcdef",
    timelock: 9900,
    claimed: false,
    refunded: true,
    sourceConfirmations: 15,
    destConfirmations: 12,
    requiredConfirmations: 12
  }, now);
  assert.equal(view4.phase, "REFUNDED");
  assert.equal(view4.timelockStatus, "EXPIRED");
});

test("3. Telemetry event logging and querying", () => {
  const dash = new CrossChainDashboard();

  dash.recordEvent("SWAP_INITIATED", "0xAlice", { swapId: "swap_1", amount: "100" });
  dash.recordEvent("SECRET_REVEALED", "0xBob", { swapId: "swap_1", secret: "0x1234" });
  dash.recordEvent("SWAP_CLAIMED", "0xBob", { swapId: "swap_1" });

  const all = dash.getEvents();
  assert.equal(all.length, 3);

  const claimed = dash.getEvents("SWAP_CLAIMED");
  assert.equal(claimed.length, 1);
  assert.equal(claimed[0].actor, "0xBob");
});

test("4. Bridge health summary and volume aggregation", () => {
  const dash = new CrossChainDashboard();

  const swaps = [
    { phase: "CLAIMED", amount: 50n * ONE_ETHER },
    { phase: "CLAIMED", amount: 150n * ONE_ETHER },
    { phase: "ACTIVE", amount: 100n * ONE_ETHER },
    { phase: "PENDING_CONFIRMATION", amount: 25n * ONE_ETHER },
    { phase: "REFUNDED", amount: 10n * ONE_ETHER }
  ];

  const summary = dash.summarizeBridgeHealth(swaps);
  assert.equal(summary.totalSwaps, 5);
  assert.equal(summary.claimedSwaps, 2);
  assert.equal(summary.activeSwaps, 1);
  assert.equal(summary.pendingSwaps, 1);
  assert.equal(summary.refundedSwaps, 1);
  assert.equal(summary.totalVolumeClaimed, (200n * ONE_ETHER).toString());
});
