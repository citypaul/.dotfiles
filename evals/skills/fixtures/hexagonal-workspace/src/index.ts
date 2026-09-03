import { sendWeeklyDigest, type DigestDeps } from "./digest";
import { createRouter } from "./lib/router";

export type AppDeps = DigestDeps;

export const createApp = (deps: AppDeps) => {
  const router = createRouter();

  router.post("/teams/:teamId/digest", async (request) => {
    const teamId = request.params.teamId ?? "";
    if (teamId.trim() === "") return { status: 400, body: { error: "team id required" } };
    await sendWeeklyDigest(deps, teamId);
    return { status: 202 };
  });

  return { router };
};
