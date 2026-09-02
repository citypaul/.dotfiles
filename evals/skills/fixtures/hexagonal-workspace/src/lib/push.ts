// Stand-in for a push-notification SDK. We do not own this API shape.

export type PushConfig = {
  readonly apiKey: string;
};

export type PushMessage = {
  readonly deviceToken: string;
  readonly title: string;
  readonly body: string;
};

export type PushClient = {
  readonly notify: (message: PushMessage) => Promise<{ readonly delivered: boolean }>;
};

export const createPushClient = (config: PushConfig): PushClient => ({
  notify: async (message) => {
    process.stdout.write(`[push ${config.apiKey.slice(0, 4)}…] ${message.deviceToken}: ${message.title}\n`);
    return { delivered: true };
  },
});
