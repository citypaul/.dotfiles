// Stand-in for a hosted transactional-email HTTP SDK. We do not own this API shape.

export type MailApiConfig = {
  readonly apiKey: string;
  readonly sender: string;
};

export type MailApiClient = {
  readonly messages: {
    readonly create: (input: {
      readonly sender: string;
      readonly recipients: ReadonlyArray<string>;
      readonly subject: string;
      readonly textBody: string;
    }) => Promise<{ readonly id: string; readonly accepted: boolean }>;
  };
};

export const createMailApiClient = (config: MailApiConfig): MailApiClient => ({
  messages: {
    create: async (input) => {
      process.stdout.write(`[mail-api] ${config.sender} -> ${input.recipients.join(",")}: ${input.subject}\n`);
      return { id: `${Date.now()}`, accepted: true };
    },
  },
});
