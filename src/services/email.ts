import nodemailer from 'nodemailer'

// Function to create transporter with current credentials
function createTransporter() {
  const emailUser = process.env.EMAIL_USER || 'jairambhumi2025@gmail.com'
  const emailPassword = process.env.EMAIL_PASSWORD

  if (!emailPassword || emailPassword === 'your_app_password_here' || emailPassword === '') {
    throw new Error('EMAIL_PASSWORD not configured in .env file. Please add your Gmail App Password.')
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPassword,
    },
  })
}

export async function sendPasswordResetEmail(email: string, resetLink: string, role: string) {
  try {
    const emailUser = process.env.EMAIL_USER || 'jairambhumi2025@gmail.com'
    const emailPassword = process.env.EMAIL_PASSWORD

    console.log('Email configuration:', {
      user: emailUser,
      hasPassword: !!emailPassword,
      passwordLength: emailPassword?.length
    })

    if (!emailPassword || emailPassword === 'your_app_password_here' || emailPassword === '') {
      throw new Error('EMAIL_PASSWORD not configured in .env file. Please add your Gmail App Password.')
    }

    const transporter = createTransporter()

    const mailOptions = {
      from: emailUser,
      to: email,
      subject: 'Reset Your Flexify Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">FLEXIFY</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Password Reset Request</p>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #111827; margin-top: 0;">Hello,</h2>
            <p style="color: #4b5563; line-height: 1.6;">
              You requested a password reset for your ${role} account. Click the button below to reset your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 30px; border-radius: 6px; font-weight: 600;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
              This link will expire in 1 hour. If you didn't request this, please ignore this email.
            </p>
            
            <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <span style="color: #667eea; word-break: break-all;">${resetLink}</span>
            </p>
          </div>
          
          <div style="background: #111827; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} FLEXIFY. All rights reserved.</p>
          </div>
        </div>
      `,
    }

    console.log('Attempting to send email to:', email)
    const info = await transporter.sendMail(mailOptions)
    console.log('Password reset email sent successfully:', info.messageId)
    return info
  } catch (error: any) {
    console.error('Error sending password reset email:', error)
    console.error('Error details:', error.message)
    throw error
  }
}

