export interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  recipients: string[];
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(
  config: EmailConfig,
  subject: string,
  htmlBody: string
): Promise<EmailSendResult> {
  if (!config.apiKey) {
    return { success: false, error: "Resend API key not configured" };
  }

  if (!config.recipients || config.recipients.length === 0) {
    return { success: false, error: "No email recipients configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${config.fromName} <${config.fromEmail}>`,
        to: config.recipients,
        subject,
        html: htmlBody,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return { success: false, error: `Resend API error (${response.status}): ${errBody}` };
    }

    const data = await response.json() as { id: string };
    return { success: true, messageId: data.id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
