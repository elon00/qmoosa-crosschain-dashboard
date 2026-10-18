export type SwapPhase =
  | "UNINITIALIZED"
  | "PENDING_CONFIRMATION"
  | "ACTIVE"
  | "CLAIMED"
  | "REFUNDED"
  | "REORG_SUSPENDED";

export type TimelockSafetyStatus =
  | "SAFE"
  | "MARGINAL"
  | "DANGEROUS"
  | "EXPIRED";

export interface CrossChainSwapView {
  swapId: string;
  initiator: string;
  recipient: string;
  sourceChainId: number;
  destChainId: number;
  amount: string;
  hashlock: string;
  timelock: number;
  sourceConfirmations: number;
  destConfirmations: number;
  requiredConfirmations: number;
  phase: SwapPhase;
  timelockStatus: TimelockSafetyStatus;
  remainingSeconds: number;
}

export interface TelemetryEvent {
  id: string;
  type:
    | "SWAP_INITIATED"
    | "SECRET_REVEALED"
    | "SWAP_CLAIMED"
    | "SWAP_REFUNDED"
    | "REORG_DETECTED";
  actor: string;
  data: Record<string, any>;
  timestamp: number;
}

export interface BridgeHealthSummary {
  totalSwaps: number;
  activeSwaps: number;
  claimedSwaps: number;
  refundedSwaps: number;
  pendingSwaps: number;
  totalVolumeClaimed: string;
}
