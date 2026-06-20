import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env";

export type Mail = { to: string; subject: string; text: string };

export const sentMessages: Mail[] = [];

let transporter: Transporter | null = null;
if (env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER
            ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
            : undefined,
    });
}

// send mail (SMTP, or log in dev)
export const sendMail = async (mail: Mail): Promise<void> => {
    sentMessages.push(mail);
    if (transporter) {
        await transporter.sendMail({ from: env.MAIL_FROM, ...mail });
    } else {
        console.log(
            `[mail] to=${mail.to} subject="${mail.subject}"\n${mail.text}\n`,
        );
    }
};

export const lastMailTo = (email: string): Mail | undefined =>
    [...sentMessages].reverse().find((m) => m.to === email);
