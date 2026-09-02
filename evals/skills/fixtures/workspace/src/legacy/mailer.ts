export const sendEmail = async (message: {
  readonly to: string;
  readonly subject: string;
  readonly body: string;
}): Promise<void> => {
  await fetch("https://mail.example.com/send", {
    method: "POST",
    body: JSON.stringify(message),
  });
};
