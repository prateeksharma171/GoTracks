import { Resend } from "resend";
import { env } from "../config/env.js";
import { buildOtpTemplate } from "../templates/otpTemplate.js";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

type SendOtpEmailInput = {
  to: string;
  otp: string;
  recipientName?: string;
  expiresInMinutes?: number;
};

class ResendSingleton {
  private static client: Resend | null = null;

  static getClient(): Resend {
    if (!this.client) {
      this.client = new Resend(env.resendApiKey);
    }

    return this.client;
  }
}

export const getResendClient = (): Resend => ResendSingleton.getClient();

export const sendOtpEmail = async ({
  to,
  otp,
  recipientName,
  expiresInMinutes = 5,
}: SendOtpEmailInput) => {
  const resend = getResendClient();
  const template = buildOtpTemplate({
    appName: env.serviceName,
    otp,
    recipientName,
    expiresInMinutes,
  });

  const response = await resend.emails.send({
    from: `${env.resendFromName} <${env.resendFromEmail}>`,
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  if (response.error) {
    logger.error("Failed to send OTP email", response.error);
    throw new AppError(response.error.message, 502);
  }

  return response;
};
