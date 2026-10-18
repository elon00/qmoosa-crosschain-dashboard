# @qmoosa/crosschain-dashboard

QMOOSA Cross-Chain Dashboard — Web4 Atomic Swap Bridge Terminal, Health Gauges, Safety Margin Evaluator & Telemetry Store.

## Features
- **Phase Evaluation:** Deterministic swap phase classification across confirmation depth, settlement, and timelocks.
- **Timelock Safety Monitor:** Proactive alerts (`SAFE`, `MARGINAL`, `DANGEROUS`, `EXPIRED`) ensuring counterparty secret safety margin adherence.
- **Event Telemetry Store:** In-memory append-only audit trail for atomic bridge events.
- **Global Bridge Metrics:** Aggregated claim volumes, active swap counts, and reorg telemetry.

## Usage
```typescript
import { CrossChainDashboard } from "@qmoosa/crosschain-dashboard";

const dashboard = new CrossChainDashboard(300); // 300s safety margin
const status = dashboard.evaluateSwapStatus({ ...swapData }, Math.floor(Date.now() / 1000));
console.log(status.phase, status.timelockStatus);
```

## License
MIT
