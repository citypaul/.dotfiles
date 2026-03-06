# Rename Refactoring

1. STOP: Propose new name options to human
2. After human chooses: Add new name (alias or wrapper)
3. Run tests, commit
4. Migrate callers one by one (test + commit each)
5. STOP: Confirm with human before removing old name
6. Remove old name
7. Run tests, commit
