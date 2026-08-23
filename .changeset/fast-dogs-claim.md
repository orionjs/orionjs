---
'@orion-js/dogs': patch
'@orion-js/mongodb': patch
---

Use MongoDB 8 sorted `updateOne` for lower-contention job acquisition, with automatic fallback on
older servers, and update the MongoDB driver to support the optimized command.
