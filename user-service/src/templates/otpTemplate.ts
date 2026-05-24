type OtpTemplateInput = {
  appName?: string;
  otp: string;
  recipientName?: string;
  expiresInMinutes?: number;
};

type OtpTemplate = {
  subject: string;
  html: string;
  text: string;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const buildOtpTemplate = ({
  appName = "GoTracks",
  otp,
  recipientName,
  expiresInMinutes = 10
}: OtpTemplateInput): OtpTemplate => {
  const safeAppName = escapeHtml(appName);
  const safeOtp = escapeHtml(otp);
  const safeRecipientName = recipientName ? escapeHtml(recipientName) : "there";
  const subject = `${appName} verification code: ${otp}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${safeAppName} verification code</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#10233f;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#eff6ff 0%,#f8fafc 100%);padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 24px 80px rgba(15,23,42,0.12);">
                <tr>
                  <td style="background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 55%,#38bdf8 100%);padding:40px 40px 56px;">
                    <div style="display:inline-block;padding:8px 14px;border:1px solid rgba(255,255,255,0.2);border-radius:999px;background:rgba(255,255,255,0.12);color:#dbeafe;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;">
                      ${safeAppName}
                    </div>
                    <h1 style="margin:20px 0 12px;color:#ffffff;font-size:34px;line-height:1.15;font-weight:700;">
                      Your one-time verification code
                    </h1>
                    <p style="margin:0;color:rgba(255,255,255,0.82);font-size:16px;line-height:1.7;max-width:420px;">
                      Confirm your identity and keep things moving. Enter this code in the app to finish your secure verification.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <p style="margin:0 0 16px;font-size:17px;line-height:1.7;">
                      Hi ${safeRecipientName},
                    </p>
                    <p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:#334155;">
                      Use the verification code below to continue with your ${safeAppName} request. This code expires in ${expiresInMinutes} minutes.
                    </p>
                    <div style="margin:0 0 28px;padding:28px 20px;border-radius:24px;background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);border:1px solid #bfdbfe;text-align:center;">
                      <div style="margin:0 0 10px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#1d4ed8;font-weight:700;">
                        Verification code
                      </div>
                      <div style="font-size:40px;line-height:1;letter-spacing:0.34em;font-weight:800;color:#0f172a;">
                        ${safeOtp}
                      </div>
                    </div>
                    <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#475569;">
                      If you did not request this code, you can safely ignore this email.
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">
                      For security, never share this code with anyone.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 40px 36px;border-top:1px solid #e2e8f0;background:#f8fafc;">
                    <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;">
                      Sent by ${safeAppName}. This is an automated security email, so replies may not be monitored.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `.trim();

  const text = [
    `${appName} verification code`,
    "",
    `Hi ${recipientName ?? "there"},`,
    "",
    `Use this OTP to continue: ${otp}`,
    `This code expires in ${expiresInMinutes} minutes.`,
    "",
    "If you did not request this code, you can ignore this email."
  ].join("\n");

  return {
    subject,
    html,
    text
  };
};
