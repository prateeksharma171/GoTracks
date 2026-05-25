import nodemailer from "nodemailer";
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

class MailTransportSingleton {
  private static transporter: nodemailer.Transporter | null = null;

  static getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpSecure,
        requireTLS: env.smtpRequireTls,
        auth: {
          user: env.smtpUser,
          pass: env.smtpPass,
        },
      });
    }

    return this.transporter;
  }
}

export const getMailTransporter = (): nodemailer.Transporter =>
  MailTransportSingleton.getTransporter();

export const sendOtpEmail = async ({
  to,
  otp,
  recipientName,
  expiresInMinutes = 5,
}: SendOtpEmailInput) => {
  const transporter = getMailTransporter();
  const template = buildOtpTemplate({
    appName: env.serviceName,
    otp,
    recipientName,
    expiresInMinutes,
  });

  try {
    return await transporter.sendMail({
      from: `"${env.smtpFromName}" <${env.smtpFromEmail}>`,
      sender: `"${env.smtpFromName}" <${env.smtpFromEmail}>`,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (error) {
    logger.error("Failed to send OTP email", error);
    throw new AppError("Failed to send OTP email", 502);
  }
};
