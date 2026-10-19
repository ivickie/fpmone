import crypto from 'crypto';

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface VerificationEmailParams {
  toEmail: string;
  recipientName: string;
  otp: string;
  expiresInMinutes?: number;
}

export interface PasswordResetEmailParams {
  toEmail: string;
  recipientName: string;
  resetToken: string;
  expiresInMinutes?: number;
}

export interface BrevoStatus {
  configured: boolean;
  hasApiKey: boolean;
  hasSenderEmail: boolean;
  senderEmail?: string;
  senderName: string;
  appBaseUrl: string;
  missing: string[];
}

export class EmailService {
  private static readonly BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
  private static readonly BREVO_SENDERS_URL = 'https://api.brevo.com/v3/senders';

  public static getApiKey(): string | undefined {
    return process.env.BREVO_API_KEY?.trim();
  }

  public static getSenderEmail(): string | undefined {
    return process.env.BREVO_SENDER_EMAIL?.trim();
  }

  public static getSenderName(): string {
    return process.env.BREVO_SENDER_NAME?.trim() || "Faith Preachers Ministries Int'l";
  }

  public static getAppBaseUrl(): string {
    const raw = process.env.APP_BASE_URL?.trim() || 'https://www.fpmglobal.online';
    return raw.replace(/\/+$/, '');
  }

  public static isConfigured(): boolean {
    const key = this.getApiKey();
    const email = this.getSenderEmail();
    return Boolean(key && key.length > 5 && email && email.includes('@'));
  }

  public static getConfigurationStatus(): BrevoStatus {
    const key = this.getApiKey();
    const email = this.getSenderEmail();
    const missing: string[] = [];

    if (!key || key.length === 0) missing.push('BREVO_API_KEY');
    if (!email || email.length === 0) missing.push('BREVO_SENDER_EMAIL');

    return {
      configured: missing.length === 0,
      hasApiKey: Boolean(key && key.length > 5),
      hasSenderEmail: Boolean(email && email.includes('@')),
      senderEmail: email || undefined,
      senderName: this.getSenderName(),
      appBaseUrl: this.getAppBaseUrl(),
      missing
    };
  }

  /**
   * Validates if the sender configured in environment variables is authorized in the Brevo account.
   */
  public static async verifySenderStatus(): Promise<{
    success: boolean;
    configuredSender: string;
    authorized: boolean;
    senders?: Array<{ id: number; name: string; email: string; active: boolean }>;
    error?: string;
  }> {
    const status = this.getConfigurationStatus();
    if (!status.configured) {
      return {
        success: false,
        configuredSender: status.senderEmail || 'none',
        authorized: false,
        error: `Missing configuration: ${status.missing.join(', ')}`
      };
    }

    try {
      const response = await fetch(this.BREVO_SENDERS_URL, {
        method: 'GET',
        headers: {
          'api-key': this.getApiKey()!,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        return {
          success: false,
          configuredSender: status.senderEmail!,
          authorized: false,
          error: `Brevo Senders API error (${response.status}): ${(errorJson as any)?.message || response.statusText}`
        };
      }

      const data = await response.json() as any;
      const sendersList = Array.isArray(data.senders) ? data.senders : [];
      const match = sendersList.find((s: any) => s.email?.toLowerCase() === status.senderEmail!.toLowerCase());

      return {
        success: true,
        configuredSender: status.senderEmail!,
        authorized: Boolean(match && match.active !== false),
        senders: sendersList
      };
    } catch (err: any) {
      return {
        success: false,
        configuredSender: status.senderEmail!,
        authorized: false,
        error: err.message || 'Failed to connect to Brevo API.'
      };
    }
  }

  /**
   * Sends a transactional email using Brevo's v3 SMTP email API.
   */
  public static async sendEmail(options: SendEmailOptions): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const status = this.getConfigurationStatus();
    if (!status.configured) {
      const errMsg = `Brevo transactional email service is unconfigured. Missing: ${status.missing.join(', ')}.`;
      console.error(`[BREVO EMAIL SERVICE] ${errMsg}`);
      return { success: false, error: errMsg };
    }

    const payload = {
      sender: {
        name: status.senderName,
        email: status.senderEmail!
      },
      to: [
        {
          email: options.to.trim().toLowerCase(),
          name: options.toName?.trim() || options.to.split('@')[0]
        }
      ],
      subject: options.subject,
      htmlContent: options.htmlContent,
      textContent: options.textContent || options.subject
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(this.BREVO_API_URL, {
        method: 'POST',
        headers: {
          'api-key': this.getApiKey()!,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = (responseData as any)?.message || `HTTP ${response.status} ${response.statusText}`;
        console.error(`[BREVO API ERROR ${response.status}]`, errorMsg);
        return {
          success: false,
          error: `Brevo email delivery failed: ${errorMsg}`
        };
      }

      const messageId = (responseData as any)?.messageId || 'sent';
      console.log(`[BREVO EMAIL SENT] Recipient: ${options.to} | Subject: "${options.subject}" | MessageId: ${messageId}`);
      return {
        success: true,
        messageId
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      const errorMsg = isAbort ? 'Brevo API request timed out after 15 seconds.' : (err.message || 'Network error');
      console.error('[BREVO SEND EXCEPTION]', errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  /**
   * Generates and dispatches a single-use 6-digit OTP verification email.
   */
  public static async sendVerificationOtp(params: VerificationEmailParams): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const { toEmail, recipientName, otp, expiresInMinutes = 10 } = params;
    const formattedOtp = otp.split('').join(' ');

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - FPM Global</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #001F3F 0%, #08284d 100%); padding: 32px 24px; text-align: center; border-bottom: 3px solid #D4AF37;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; width: 56px; height: 56px; background: rgba(255,255,255,0.1); border: 1px solid rgba(212,175,55,0.4); border-radius: 50%; padding: 8px; margin-bottom: 12px;">
                      <img src="https://www.fpmglobal.online/church-logo.png" alt="FPM Global" width="40" height="40" style="display: block; border-radius: 50%;" />
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">FAITH PREACHERS MINISTRIES INT'L</h1>
                    <p style="margin: 4px 0 0 0; color: #D4AF37; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;">Global Membership & Attendance Portal</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Area -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Verify Your Email Address</h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Dear <strong>${recipientName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Welcome to <strong>Faith Preachers Ministries International</strong>! To activate your account and verify that this email address belongs to you, please enter the 6-digit verification code below:
              </p>

              <!-- OTP Code Display Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="background-color: #f8fafc; border: 2px dashed #001F3F; border-radius: 12px; padding: 22px 16px;">
                    <div style="font-family: 'Courier New', Courier, monospace, monospace; font-size: 34px; font-weight: 800; letter-spacing: 12px; color: #001F3F; text-indent: 12px;">
                      ${otp}
                    </div>
                    <div style="margin-top: 8px; font-size: 11px; font-weight: 600; color: #b45309; text-transform: uppercase; letter-spacing: 0.5px;">
                      Expires in ${expiresInMinutes} minutes &bull; Single-use only
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #64748b;">
                Enter this code in your FPM Global mobile app or web portal to proceed with your membership profile.
              </p>

              <!-- Security Warning -->
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 4px; margin-top: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #991b1b;">
                  <strong>Security Note:</strong> Never share this code with anyone. FPM Global pastoral staff and administrators will never call or message you asking for your verification code.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #64748b;">
                Faith Preachers Ministries Int'l &bull; Faith Cathedral HQ
              </p>
              <p style="margin: 0 0 12px 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                Nigeria (Lagos, Ilorin, Abuja) &bull; United Kingdom &bull; North America (Houston, Canada)
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                If you did not initiate this registration, please disregard this email.
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

    const textContent = `
FAITH PREACHERS MINISTRIES INT'L
Global Membership & Attendance Portal

Dear ${recipientName},

Welcome to Faith Preachers Ministries International!

Your 6-digit email verification code is: ${otp}

This code will expire in ${expiresInMinutes} minutes and can only be used once.

Security Notice: Never share this verification code with anyone. FPM Global staff will never request your verification code.

If you did not initiate this registration, please disregard this email.
    `.trim();

    return this.sendEmail({
      to: toEmail,
      toName: recipientName,
      subject: `Your FPM Global Verification Code: ${otp}`,
      htmlContent,
      textContent
    });
  }

  /**
   * Generates and dispatches a secure password reset link email.
   */
  public static async sendPasswordReset(params: PasswordResetEmailParams): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const { toEmail, recipientName, resetToken, expiresInMinutes = 60 } = params;
    const baseUrl = this.getAppBaseUrl();
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(toEmail)}`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - FPM Global</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #001F3F 0%, #08284d 100%); padding: 32px 24px; text-align: center; border-bottom: 3px solid #D4AF37;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; width: 56px; height: 56px; background: rgba(255,255,255,0.1); border: 1px solid rgba(212,175,55,0.4); border-radius: 50%; padding: 8px; margin-bottom: 12px;">
                      <img src="https://www.fpmglobal.online/church-logo.png" alt="FPM Global" width="40" height="40" style="display: block; border-radius: 50%;" />
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">FAITH PREACHERS MINISTRIES INT'L</h1>
                    <p style="margin: 4px 0 0 0; color: #D4AF37; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;">Security & Account Management</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Area -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f172a;">Password Reset Request</h2>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Hello <strong>${recipientName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                We received a request to reset the password for your FPM Global church account associated with <strong>${toEmail}</strong>. Click the secure button below to choose a new password:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" target="_blank" style="background-color: #001F3F; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; display: inline-block; border: 1px solid #D4AF37; box-shadow: 0 4px 12px rgba(0,31,63,0.25);">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
                If the button above does not work, copy and paste this link into your web browser:
              </p>
              <p style="margin: 0 0 24px 0; font-size: 11px; color: #2563eb; word-break: break-all; line-height: 1.4;">
                <a href="${resetUrl}" style="color: #2563eb; text-decoration: underline;">${resetUrl}</a>
              </p>

              <!-- Expiry & Security Notice -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-top: 20px;">
                <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #334155;">
                  &bull; This link is valid for ${expiresInMinutes} minutes and can only be used once.
                </p>
                <p style="margin: 0; font-size: 12px; color: #64748b;">
                  &bull; If you did not request a password reset, you can safely ignore this email. Your existing password will remain active.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #64748b;">
                Faith Preachers Ministries Int'l &bull; Global Headquarters
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11px; color: #94a3b8;">
                https://www.fpmglobal.online &bull; Faith &bull; Purpose &bull; Mission
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

    const textContent = `
FAITH PREACHERS MINISTRIES INT'L
Password Reset Request

Hello ${recipientName},

We received a request to reset the password for your FPM Global church account (${toEmail}).

To reset your password, please visit the following link:
${resetUrl}

This link will expire in ${expiresInMinutes} minutes and can only be used once.

If you did not request this password reset, please ignore this email. Your existing password will remain unchanged.
    `.trim();

    return this.sendEmail({
      to: toEmail,
      toName: recipientName,
      subject: 'Reset Your FPM Global Password',
      htmlContent,
      textContent
    });
  }
}
