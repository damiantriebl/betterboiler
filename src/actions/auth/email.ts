"use server";
import sgMail from "@sendgrid/mail";

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  if (!process.env.SENDGRID_API_KEY) {
    return {
      success: false,
      message: "Failed to send email. Please try again later.",
    };
  }
  if (!process.env.EMAIL_FROM) {
    return {
      success: false,
      message: "Failed to send email. Please try again later.",
    };
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const message = {
    to: to.toLowerCase().trim(),
    from: process.env.EMAIL_FROM,
    subject: subject.trim(),
    text: text.trim(),
  };

  try {
    const [response] = await sgMail.send(message);

    console.log(`Email sent successfully to ${to}`);

    return {
      success: true,
      message: 'Email sent successfully',
      messageId: response.headers?.["x-message-id"],
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      message: "Failed to send email. Please try again later.",
    };
  }
}
