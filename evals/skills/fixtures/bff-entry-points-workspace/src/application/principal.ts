// Who is calling, in the application's own words.
export type AuthenticatedPrincipal = {
  readonly userId: string;
  readonly tenantId: string;
};
