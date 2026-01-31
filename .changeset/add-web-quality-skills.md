---
"@paulhammond/dotfiles": minor
---

Add web quality skills from addyosmani/web-quality-skills

The install script now fetches 6 web quality skills directly from Addy Osmani's
[web-quality-skills](https://github.com/addyosmani/web-quality-skills) repository
at install time, ensuring users always get the latest versions:

- **accessibility** - WCAG compliance, screen reader support, keyboard navigation
- **best-practices** - Security, modern APIs, code quality patterns
- **core-web-vitals** - LCP, INP, CLS specific optimizations
- **performance** - Loading speed, runtime efficiency, resource optimization
- **seo** - Search engine optimization, crawlability, structured data
- **web-quality-audit** - Comprehensive Lighthouse-based quality review

Skills are sourced from upstream rather than vendored, so they stay current as the
original repository is updated. The upstream MIT License is preserved alongside the
installed skills.

Use `--no-external` flag to skip external community skills during installation.

**Attribution:** [Addy Osmani](https://github.com/addyosmani) -
[web-quality-skills](https://github.com/addyosmani/web-quality-skills) (MIT License).
