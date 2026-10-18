import crypto from "node:crypto";
import {
  SwapPhase,
  TimelockSafetyStatus,
  CrossChainSwapView,
  TelemetryEvent,
  BridgeHealthSummary
} from "./types.js";

export class CrossChainDashboard {
  private readonly events: TelemetryEvent[] = [];
  public minSafetyMarginSeconds: number = 300; // 5 minutes

  constructor(minSafetyMarginSeconds: number = 300) {
    this.minSafetyMarginSeconds = minSafetyMarginSeconds;
  }

  public classifyTimelockSafety(timelock: number, currentTime: number): TimelockSafetyStatus {
    if (currentTime >= timelock) {
      return "EXPIRED";
    }
    const remaining = timelock - currentTime;
    if (remaining < 120) {
      return "DANGEROUS";
    } else if (remaining < this.minSafetyMarginSeconds) {
      return "MARGINAL";
    } else {
      return "SAFE";
    }
  }

  public evaluateSwapStatus(
    swap: {
      swapId: string;
      initiator: string;
      recipient: string;
      sourceChainId: number;
      destChainId: number;
      amount: bigint;
      hashlock: string;
      timelock: number;
      claimed: boolean;
      refunded: boolean;
      sourceConfirmations: number;
      destConfirmations: number;
      requiredConfirmations: number;
    },
    currentTime: number
  ): CrossChainSwapView {
    let phase: SwapPhase = "ACTIVE";

    if (swap.claimed) {
      phase = "CLAIMED";
    } else if (swap.refunded) {
      phase = "REFUNDED";
    } else if (
      swap.sourceConfirmations < swap.requiredConfirmations ||
      swap.destConfirmations < swap.requiredConfirmations
    ) {
      phase = "PENDING_CONFIRMATION";
    }

    const timelockStatus = this.classifyTimelockSafety(swap.timelock, currentTime);
    const remainingSeconds = Math.max(0, swap.timelock - currentTime);

    return {
      swapId: swap.swapId,
      initiator: swap.initiator,
      recipient: swap.recipient,
      sourceChainId: swap.sourceChainId,
      destChainId: swap.destChainId,
      amount: swap.amount.toString(),
      hashlock: swap.hashlock,
      timelock: swap.timelock,
      sourceConfirmations: swap.sourceConfirmations,
      destConfirmations: swap.destConfirmations,
      requiredConfirmations: swap.requiredConfirmations,
      phase,
      timelockStatus,
      remainingSeconds
    };
  }

  public recordEvent(
    type: TelemetryEvent["type"],
    actor: string,
    data: Record<string, any>
  ): TelemetryEvent {
    const event: TelemetryEvent = {
      id: `evt_${crypto.randomBytes(6).toString("hex")}`,
      type,
      actor,
      data,
      timestamp: Math.floor(Date.now() / 1000)
    };
    this.events.push(event);
    return event;
  }

  public getEvents(filterType?: TelemetryEvent["type"]): TelemetryEvent[] {
    if (!filterType) return [...this.events];
    return this.events.filter(e => e.type === filterType);
  }

  public summarizeBridgeHealth(
    swaps: Array<{ phase: SwapPhase; amount: bigint }>
  ): BridgeHealthSummary {
    let totalVolumeClaimed = 0n;
    let activeSwaps = 0;
    let claimedSwaps = 0;
    let refundedSwaps = 0;
    let pendingSwaps = 0;

    for (const s of swaps) {
      if (s.phase === "ACTIVE") activeSwaps++;
      else if (s.phase === "CLAIMED") {
        claimedSwaps++;
        totalVolumeClaimed += s.amount;
      } else if (s.phase === "REFUNDED") refundedSwaps++;
      else if (s.phase === "PENDING_CONFIRMATION") pendingSwaps++;
    }

    return {
      totalSwaps: swaps.length,
      activeSwaps,
      claimedSwaps,
      refundedSwaps,
      pendingSwaps,
      totalVolumeClaimed: totalVolumeClaimed.toString()
    };
  }
}
