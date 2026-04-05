---
"@paulhammond/dotfiles": patch
---

Make api-design skill flexible on error response format

RFC 9457 Problem Details is now recommended for public APIs with external consumers. Internal APIs with a single frontend can use a simpler consistent shape (error code + optional message + field errors). The key requirement is consistency across endpoints, not a specific format.

- Add "Choosing an Error Format" section with guidance by API type
- Show simpler ApiError shape as a valid alternative
- Update verification checklist to accept either format
- Update Content-Type guidance for both formats
