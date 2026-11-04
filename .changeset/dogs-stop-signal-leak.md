---
"@orion-js/dogs": patch
---

Fix a memory leak in the job scheduler. Every claim attempt and every poll wait raced against a stop promise that only resolves on `stop()`, and each race left a reaction attached to it for the life of the worker. That is ~1.2 KB per claim attempt with 75 jobs, because it held on to the job-name array. Idle workers do one claim per partition every `pollInterval`, so the heap grew all the time with or without load (~65 MB/h with 30 partitions), and major GC pauses got longer. Stop-interruptible waits now use an `AbortSignal` whose listener is removed when each wait ends. The capacity wait no longer attaches reactions to running executions either. `stop()` still interrupts the poll, capacity and jobs-filter waits immediately.
