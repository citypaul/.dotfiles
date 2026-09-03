// Stand-in for a third-party SMTP SDK. We do not own this API shape.

export type SmtpConfig = {
  readonly host: string;
  readonly port: number;
  readonly from: string;
};

export type SmtpMessage = {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly text: string;
};

export type SmtpClient = {
  readonly sendMail: (message: SmtpMessage) => Promise<{ readonly messageId: string }>;
};

export const createSmtpClient = (config: SmtpConfig): SmtpClient => ({
  sendMail: async (message) => {
    process.stdout.write(`[smtp ${config.host}:${config.port}] ${message.from} -> ${message.to}: ${message.subject}\n`);
    return { messageId: `${Date.now()}@${config.host}` };
  },
});
