---
"@orion-js/mongodb": patch
---

Fix text index matching in deleteUnusedIndexes and checkIndexes. MongoDB stores text indexes with special internal keys (_fts, _ftsx) instead of the original field names, so the matching logic now compares by generated index name for text indexes. Also updated checkIndexes to use merged indexes from the registry to avoid false warnings when indexes are split across multiple createCollection calls.

Remove mongodb+srv:// and mongodb:// protocol prefix from censored URI in connection logs for cleaner output.
