# RFC 9457 Problem Details — Deep Reference

Detailed member semantics, JSON examples, and security guidance for RFC 9457 (Problem Details for HTTP APIs). For when to choose this format versus a simpler shape, see the "Choosing an Error Format" section in `../SKILL.md`.

## Standard Members

```typescript
// House convention: RFC 9457 makes every member optional; we require the
// first four so responses are uniformly useful to clients.
type ProblemDetail = {
  readonly type: string;       // URI identifying the error type (defaults to "about:blank")
  readonly title: string;      // Human-readable summary — SHOULD NOT change between occurrences (except localization)
  readonly status: number;     // HTTP status code — MUST match the actual HTTP response status
  readonly detail: string;     // Explanation specific to this occurrence — help the client fix it
  readonly instance?: string;  // URI identifying this specific occurrence
};
```

When `type` is absent or `"about:blank"`, the problem has no additional semantics beyond the HTTP status code. Use `title` matching the standard HTTP phrase (e.g., "Not Found" for 404).

When `type` is a resolvable URI (http/https), it SHOULD point to human-readable documentation explaining how to resolve the problem.

## Example — Single Error

```json
{
  "type": "https://api.example.com/problems/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 422,
  "detail": "Your account balance of $5.00 is insufficient for a $10.00 transfer.",
  "instance": "/transfers/abc123",
  "balance": 5.00
}
```

**Extension members** (like `balance` above) are allowed — clients MUST ignore extensions they don't recognize, which enables forward-compatible evolution of error responses.

## Example — Validation Errors

Multiple problems of the same type use an extension array with JSON Pointer:

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Your request is not valid.",
  "status": 422,
  "detail": "2 validation errors",
  "errors": [
    { "detail": "must be a positive integer", "pointer": "#/age" },
    { "detail": "must be 'green', 'red' or 'blue'", "pointer": "#/profile/color" }
  ]
}
```

For multiple problems of **different types**, return the most relevant or urgent one — don't create batch problem types (they don't map well into HTTP semantics).

## When NOT to Use Problem Details

- Generic problems expressed well by plain status codes (e.g., a simple 404 doesn't always need a body)
- When your application already defines a more appropriate error format
- As a debugging tool for internal implementation

## Security (RFC 9457 §5)

Error responses must help clients correct issues, not serve as debugging tools. Every field in a problem detail is a potential information leak:

- **Never expose stack traces, internal paths, or server implementation details** — these are attack vectors
- **Vet new problem types** for information that could compromise the system or user privacy
- **Avoid linking to internal occurrence data** through the HTTP interface (e.g., don't link to internal log entries)
- **The `status` field duplicates the HTTP status code** — if they disagree, clients may behave unpredictably; keep them in sync
