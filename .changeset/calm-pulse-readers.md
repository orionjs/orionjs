---
'@orion-js/pulse': patch
---

Reduce MongoDB load with one polling coordinator per process, renewable discovery leadership,
batched recovery, and handler-only worker concurrency. Remove Change Streams and their public
configuration entirely, add a separate discovery lease timeout, and avoid ordered-lease writes
while retries are delayed.
