import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'PhysioGPT <onboarding@resend.dev>';

export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
  username: string
): Promise<boolean> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Reset Your PhysioGPT Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">PhysioGPT</h1>
          </div>
          
          <h2 style="color: #1f2937;">Password Reset Request</h2>
          
          <p style="color: #4b5563; line-height: 1.6;">
            Hi ${username},
          </p>
          
          <p style="color: #4b5563; line-height: 1.6;">
            We received a request to reset your password for your PhysioGPT account. 
            Click the button below to create a new password:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #2563eb; color: white; padding: 14px 28px; 
                      text-decoration: none; border-radius: 8px; font-weight: bold;
                      display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #4b5563; line-height: 1.6;">
            This link will expire in 1 hour for security reasons.
          </p>
          
          <p style="color: #4b5563; line-height: 1.6;">
            If you didn't request a password reset, you can safely ignore this email. 
            Your password will remain unchanged.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This is an automated message from PhysioGPT. Please do not reply to this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }

    console.log('Password reset email sent successfully:', data?.id);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}
