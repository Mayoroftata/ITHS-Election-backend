import brevo from 'sib-api-v3-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Configure API key
const defaultClient = brevo.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Initialize API
const apiInstance = new brevo.TransactionalEmailsApi();

export const sendRegistrationEmail = async (candidate) => {
  try {
    console.log('🔍 DEBUG - Starting Brevo email process...');
    console.log('🔑 Brevo API Key present:', !!process.env.BREVO_API_KEY);
    
    const recipientEmails = [
      process.env.COMMITTEE_EMAIL_1,
      process.env.COMMITTEE_EMAIL_2,
      process.env.COMMITTEE_EMAIL_3
    ].filter(email => email && email.trim() !== '');

    console.log('📧 Recipient emails:', recipientEmails);
    console.log('👤 Candidate data:', {
      name: candidate.name,
      email: candidate.email,
      position: candidate.position
    });

    if (recipientEmails.length === 0) {
      console.warn('❌ No committee emails configured in .env');
      return { success: false, error: 'No committee emails configured' };
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.to = recipientEmails.map(email => ({ email }));
    
    sendSmtpEmail.sender = { 
      email: 'mayorde676@gmail.com', 
      name: 'ITHS 2011 Alumni Election' 
    };
    
    sendSmtpEmail.subject = `New Candidate Registration - ${candidate.position}`;
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-item { margin-bottom: 15px; }
          .label { font-weight: bold; color: #495057; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 New Candidate Registration</h1>
            <p>ITHS 2011 Alumni Election</p>
          </div>
          <div class="content">
            <div class="info-item">
              <span class="label">Candidate Name:</span> ${candidate.name}
            </div>
            <div class="info-item">
              <span class="label">Email:</span> ${candidate.email}
            </div>
            <div class="info-item">
              <span class="label">Position:</span> ${candidate.position}
            </div>
            <div class="info-item">
              <span class="label">Registration Time:</span> ${new Date(candidate.createdAt).toLocaleString()}
            </div>
          </div>
          <div class="footer">
            <p>This is an automated notification from the ITHS 2011 Alumni Election System.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log('📤 Sending email via Brevo API...');
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log('✅ Brevo API Response:', data);
    console.log(`✅ Notification email sent to ${recipientEmails.length} committee members`);
    console.log('📫 Message ID:', data.messageId);
    
    return { success: true, data };

  } catch (error) {
    console.error('❌ Brevo email error details:');
    console.error('   Error message:', error.message);
    console.error('   Error status:', error.status);
    console.error('   Error code:', error.code);
    console.error('   Error response:', error.response?.body || error.response?.text);
    console.error('   Full error:', error);
    
    return { success: false, error };
  }
};