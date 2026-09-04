import type { EndpointContract, HandlerFor } from "../../../composition/registrar";
import { json } from "../../../http/respond";

export const appConfigContract = {
  method: "get",
  path: "/api/config",
  access: {
    kind: "public",
    justification: "the sign-in screen renders before any session exists",
  },
  summary: "Settings the sign-in screen needs",
} as const satisfies EndpointContract;

export const handleAppConfig: HandlerFor<typeof appConfigContract> = async () =>
  json(200, { signInPath: "/sign-in", supportEmail: "support@example.com" });
