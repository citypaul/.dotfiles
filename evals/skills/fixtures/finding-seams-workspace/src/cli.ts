import { expiringKeysReport } from "./expiry-report";
import { issueApiKey } from "./issue-key";
import { revokeApiKey } from "./revoke-key";

const option = (argv: ReadonlyArray<string>, name: string): string | undefined => {
  const index = argv.indexOf(`--${name}`);
  return index === -1 ? undefined : argv[index + 1];
};

const usage = "usage: keys issue-key --account <id> --label <text> | revoke-key --account <id> --key <n> | expiring --account <id>";

export const runCli = async (argv: ReadonlyArray<string>): Promise<string> => {
  const [command] = argv;
  const account = option(argv, "account");
  if (account === undefined) return usage;

  if (command === "issue-key") {
    const label = option(argv, "label");
    if (label === undefined) return usage;
    const result = await issueApiKey(account, label);
    if (!result.ok) return `error: ${result.reason}`;
    return `${result.key.token}\texpires ${new Date(result.key.expiresAt).toISOString()}`;
  }

  if (command === "revoke-key") {
    const key = Number(option(argv, "key"));
    if (!Number.isInteger(key)) return usage;
    return await revokeApiKey(account, key);
  }

  if (command === "expiring") {
    const lines = await expiringKeysReport(account);
    return lines.length === 0 ? "no keys expiring soon" : lines.join("\n");
  }

  return usage;
};
