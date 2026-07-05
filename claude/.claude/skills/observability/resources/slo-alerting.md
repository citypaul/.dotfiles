# SLOs and Burn-Rate Alerting

Worked detail behind SKILL.md's "SLIs, SLOs, Error Budgets" and "Alerting" sections. Primary sources: [Google SRE book ch. 4](https://sre.google/sre-book/service-level-objectives/) and [SRE Workbook, Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/).

## Choosing SLIs: A Worksheet

Per service type, start from this menu and pick the two or three that map to what users actually experience:

| Service type | Candidate SLIs |
|--------------|---------------|
| User-facing request/response | Availability (good requests / total), latency (p99 within threshold), correctness |
| Storage | Durability, availability, read/write latency |
| Pipeline / batch | Freshness (data age), throughput, correctness |
| All | Correctness — the one every system should track |

Definition discipline for each SLI:

1. **Write it as a ratio**: good events / valid events, so it reads as a percentage
2. **Define "good" precisely**: `status < 500 AND duration < 300ms` — thresholds inside the SLI, not the alert
3. **Define "valid" precisely**: exclude health checks and bot traffic explicitly, or they dilute the signal
4. **Name the measurement point**: load balancer, server, or client — each sees different failures

## Setting the SLO

- Percentiles, never averages — the tail is where users suffer
- Start from measured reality, not aspiration; tighten deliberately later
- Keep the internal target slightly stricter than anything published or contractual
- Do not overachieve: consistently delivering 99.99% against a 99.9% SLO teaches users to depend on 99.99%

## Error Budget Math

For SLO `s` over a window of `N` valid events, the budget is `(1 - s) × N` bad events. Example: 99.9% over 3 million requests in 4 weeks = 3,000 allowed errors. The budget is a spending account: releases, experiments, and planned migrations draw on it. An error budget policy says what happens when it's exhausted (e.g., feature freeze until back in budget) — agree on it *before* the first breach.

## Burn Rate

Burn rate = the rate of budget consumption relative to "exactly out of budget at window end".

- Burn rate 1 → the whole budget consumed in exactly the SLO window (30 days here)
- For a 99.9% SLO: 0.1% error budget, so a 1% error rate = burn rate 10; a 100% outage = burn rate 1000, budget gone in ~43 minutes

`burn_rate = observed_error_rate / (1 - SLO)`

## Why Naive Alert Constructions Fail

| Construction | Failure mode |
|--------------|-------------|
| Alert when error rate > SLO threshold (short window) | Fires constantly on blips — terrible precision |
| Widen the window (e.g. 36 h) | Keeps firing long after recovery — terrible reset time |
| Add a "for: 1h" duration | A 100% outage and a 0.2% blip both alert after 1 hour — detection time doesn't scale with severity |
| Single burn-rate threshold | A burn just under the threshold silently eats the whole budget |

The multiwindow, multi-burn-rate construction fixes all four properties (precision, recall, detection time, reset time) at once: the long window sizes the significance, the short window (1/12 of the long) confirms the problem is still happening.

## Parameter Tables

Budget-consumption targets: page at 2% (fast) and 5% (medium) of monthly budget, ticket at 10% (slow). Burn rate for a target = `budget_fraction × window_total / window`.

**99.9% SLO, 30-day window** (the canonical table):

| Severity | Burn rate | Long window | Short window | Budget consumed |
|----------|-----------|-------------|--------------|-----------------|
| Page | 14.4 | 1 h | 5 m | 2% |
| Page | 6 | 6 h | 30 m | 5% |
| Ticket | 1 | 3 d | 6 h | 10% |

The same burn rates and windows apply to any SLO target — only the error-rate thresholds change, because `threshold = burn_rate × (1 - SLO)`:

| SLO | Page @ 14.4× (1 h) fires at error rate | Page @ 6× (6 h) | Ticket @ 1× (3 d) |
|-----|----------------------------------------|-----------------|-------------------|
| 99.9% | 1.44% | 0.6% | 0.1% |
| 99.5% | 7.2% | 3% | 0.5% |
| 99% | 14.4% | 6% | 1% |

## Prometheus Shape

Recording rules for the SLI at each needed window, then the alert combines long + short:

```yaml
groups:
  - name: slo-pledge-api
    rules:
      - record: sli:pledge_requests:error_rate5m
        expr: |
          sum(rate(http_requests_total{job="pledge-api",code=~"5.."}[5m]))
          / sum(rate(http_requests_total{job="pledge-api"}[5m]))
      # ...same for 30m, 1h, 6h, 3d

      - alert: PledgeApiErrorBudgetBurn
        expr: |
          (sli:pledge_requests:error_rate1h > (14.4 * 0.001)
            and sli:pledge_requests:error_rate5m > (14.4 * 0.001))
          or
          (sli:pledge_requests:error_rate6h > (6 * 0.001)
            and sli:pledge_requests:error_rate30m > (6 * 0.001))
        labels:
          severity: page
        annotations:
          summary: "Pledge API burning error budget fast"
          runbook_url: https://runbooks.internal/pledge-api/error-budget-burn
```

Alert rules are code: keep them in the repo, review them like code, and unit-test them where the stack supports it (`promtool test rules` takes synthetic series and asserts which alerts fire).

## Runbook Template

Every page links one. Concise beats complete:

```markdown
# <Alert name>

**Meaning:** what user-visible symptom this alert detects, in one sentence.
**Impact:** who is affected and how badly.
**Verify:** the one dashboard/query that confirms it's real.
**Mitigate:** current known mitigations, most likely first (rollback, feature flag off, scale up).
**Escalate:** who/when if mitigations fail.
**Recent causes:** dated list — prune anything stale.
```

Review cadence: any alert below ~90% precision ("was this page real and actionable?") gets redesigned, demoted to ticket, or deleted. Track pages per on-call shift; a healthy target is a few per day *across the whole rotation*, not per person per night ([Ewaschuk](https://docs.google.com/document/d/199PqyG3UsyXlwieHaqbGiWVa8eMWi8zzAn0YfcApr8Q/mobilebasic)).
