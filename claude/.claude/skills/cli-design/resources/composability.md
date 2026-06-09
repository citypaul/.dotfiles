# Composability Patterns — Worked Shell Examples

Real-world pipe patterns a well-behaved CLI must support. Design rules and key patterns are in `../SKILL.md`; these are the concrete shapes to test against.

```bash
# Filter structured output
mycli list --json | jq '.data[] | select(.status == "failed")'

# Stream results for large datasets
mycli run --format ndjson | while read -r line; do echo "$line" | jq '.file'; done

# Feed stdin
cat previous-results.json | mycli report --format markdown

# Combine with other tools
mycli run --json | mycli diff --baseline previous.json

# Silent mode for CI — only exit code matters
mycli check --quiet || echo "Check failed!"

# Chain: create outputs an identifier, next command uses it
mycli create --json | jq -r '.data.id' | xargs mycli deploy --id

# Column selection for efficiency
mycli list --json --fields name,status,id | jq '.data[]'

# Parallel processing
mycli list --json --fields id | jq -r '.data[].id' | xargs -P4 mycli process --id
```
