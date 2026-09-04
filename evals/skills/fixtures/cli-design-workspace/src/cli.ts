import { runList } from "./builds.js";

const args = process.argv.slice(2);
const command = args[0];

const configPath = (): string => {
  const at = args.indexOf("--config");
  if (at === -1) return "tally.config.json";
  return args[at + 1] ?? "tally.config.json";
};

if (command === undefined || command === "--help" || command === "-h") {
  console.log("tally — CI build statistics");
  console.log("");
  console.log("Usage: tally <command> [options]");
  console.log("");
  console.log("Commands:");
  console.log("  list    Print every build in the data file");
  console.log("");
  console.log("Options:");
  console.log("  --config <path>   Config file to read (default: ./tally.config.json)");
  process.exit(0);
}

if (command !== "list") {
  console.log(`Unknown command: ${command}`);
  process.exit(1);
}

runList({ configPath: configPath() });
