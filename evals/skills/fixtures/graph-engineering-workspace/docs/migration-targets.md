# Migration targets

The twelve units are `schema`, `backfill`, `domain`, `api-read`, `api-write`,
`worker-read`, `worker-write`, `web-read`, `web-write`, `metrics`, `rollout`, and
`cleanup`. Schema precedes backfill; domain needs both; read paths precede matching
write paths; metrics precedes rollout; cleanup needs every write path integrated.

Each unit is expected to produce about 3,000 tokens of findings and handoff detail.
