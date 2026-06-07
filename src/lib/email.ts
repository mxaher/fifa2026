export interface EmailConfig {
  apiKey: string;
  mailjetApiKey?: string;
  mailjetSecretKey?: string;
  fromEmail: string;
  fromName: string;
  recipients: string[];
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  provider?: 'resend' | 'mailjet';
  error?: string;
}

async function sendViaResend(
  config: EmailConfig,
  subject: string,
  htmlBody: string
): Promise<EmailSendResult> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + config.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.fromName + " <" + config.fromEmail + ">",
      to: config.recipients,
      subject,
      html: htmlBody,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    return { success: false, error: "Resend (" + response.status + "): " + errBody };
  }

  const data = await response.json() as { id: string };
  return { success: true, messageId: data.id, provider: 'resend' };
}

async function sendViaMailjet(
  config: EmailConfig,
  subject: string,
  htmlBody: string
): Promise<EmailSendResult> {
  const auth = Buffer.from(config.mailjetApiKey + ":" + config.mailjetSecretKey).toString("base64");
  const response = await fetch("https://api.mailjet.com/v3.1/send", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      Messages: [{
        From: { Email: config.fromEmail, Name: config.fromName },
        To: config.recipients.map(r => ({ Email: r })),
        Subject: subject,
        HTMLPart: htmlBody,
      }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    return { success: false, error: "Mailjet (" + response.status + "): " + errBody };
  }

  const data = await response.json() as { Messages: { Status: string }[] };
  return { success: true, messageId: data.Messages?.[0]?.Status || "sent", provider: 'mailjet' };
}

export async function sendEmail(
  config: EmailConfig,
  subject: string,
  htmlBody: string
): Promise<EmailSendResult> {
  if (!config.recipients || config.recipients.length === 0) {
    return { success: false, error: "No email recipients configured" };
  }

  // Try Resend first
  let resendError = "";
  if (config.apiKey) {
    const result = await sendViaResend(config, subject, htmlBody);
    if (result.success) return result;
    resendError = result.error || "";
    console.warn("[email] Resend failed, trying Mailjet fallback:", resendError);
  }

  // Fallback to Mailjet
  if (config.mailjetApiKey && config.mailjetSecretKey) {
    return sendViaMailjet(config, subject, htmlBody);
  }

  if (!config.apiKey && !config.mailjetApiKey) {
    return { success: false, error: "No email provider configured (set Resend or Mailjet API keys)" };
  }

  return { success: false, error: "Resend: " + resendError };
}
