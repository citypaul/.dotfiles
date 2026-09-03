// Stand-in for a logging SDK with a file transport. We do not own this API shape.

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type FileLogger = {
  readonly write: (line: string) => void;
};

export const createFileLogger = ({ path }: { path: string }): FileLogger => ({
  write: (line) => {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, `${new Date().toISOString()} ${line}\n`);
  },
});
