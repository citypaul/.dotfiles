import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type Build = {
  readonly id: string;
  readonly project: string;
  readonly status: "passed" | "failed";
  readonly durationMs: number;
};

type BuildRecord = {
  readonly id: string;
  readonly project: string;
  readonly status: string;
  readonly duration_ms: number;
};

export const parseBuilds = (text: string): ReadonlyArray<Build> => {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("expected a list of builds");
  return parsed.map((entry) => {
    const record = entry as BuildRecord;
    return {
      id: record.id,
      project: record.project,
      status: record.status === "failed" ? "failed" : "passed",
      durationMs: record.duration_ms,
    };
  });
};

export const runList = (options: { readonly configPath: string }): void => {
  console.log("Scanning builds…");
  const builds = loadBuilds(options.configPath);
  for (const build of builds) {
    console.log(`${build.id}  ${build.project}  ${build.status}  ${build.durationMs}ms`);
  }
  console.log(`Done. ${builds.length} builds.`);
};

const loadBuilds = (configPath: string): ReadonlyArray<Build> => {
  try {
    const config = JSON.parse(readFileSync(resolve(configPath), "utf8")) as { readonly dataFile: string };
    return parseBuilds(readFileSync(resolve(config.dataFile), "utf8"));
  } catch (error) {
    console.log(`Error: could not read builds (${(error as Error).message})`);
    process.exit(1);
  }
};
