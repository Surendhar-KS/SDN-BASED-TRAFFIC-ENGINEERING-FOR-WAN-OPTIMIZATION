# Controller adapter placeholder

This directory is reserved for the OS-Ken/Ryu-compatible controller adapter.

The current API intentionally does **not** claim a controller is connected and does
not install OpenFlow rules. The next integration step will:

1. Subscribe to switch/port/flow statistics from the controller.
2. Discover topology from LLDP/link events and host tracking.
3. Normalize counters into timestamped rates.
4. Validate a candidate path and its residual capacity.
5. Install and verify flow rules, then roll back on failure.

Keep controller credentials and control-plane endpoints out of frontend code.
