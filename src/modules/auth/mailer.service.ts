import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  /** 인증코드 이메일 전송. SMTP 미설정 시 로그만 (개발용) */
  async sendVerificationCode(email: string, code: string): Promise<void> {
    const subject = '[Ourllet] 로그인 인증코드';
    const body = `인증코드: ${code}\n\n5분 내에 입력해 주세요.`;

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.log(`[DEV] 인증코드 미전송(SMTP 미설정). email=${email} code=${code}`);
      return;
    }

    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.default.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort ?? '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM ?? smtpUser,
        to: email,
        subject,
        text: body,
      });
      this.logger.log(`인증코드 전송 완료: ${email}`);
    } catch (err) {
      this.logger.warn('인증코드 전송 실패', err instanceof Error ? err.message : String(err));
      throw err;
    }
  }
}
