// services/emailService.js
import brevo from 'sib-api-v3-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Configure API key
const defaultClient = brevo.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

// Initialize API
const apiInstance = new brevo.TransactionalEmailsApi();

// Send confirmation email to voter
export const sendVoteConfirmationEmail = async ({ voterName, voterEmail, votes }) => {
  try {
    console.log('📧 Sending vote confirmation to:', voterEmail);
    console.log('🔑 Brevo API Key present:', !!process.env.BREVO_API_KEY);
    console.log('🔑 Brevo API Key first 10 chars:', process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.substring(0, 10) + '...' : 'MISSING');

    // Validate email
    if (!voterEmail || !voterEmail.includes('@')) {
      console.error('❌ Invalid voter email:', voterEmail);
      return { success: false, error: 'Invalid email address' };
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.to = [{ email: voterEmail, name: voterName }];
    
    // Use a verified sender email from your Brevo account
    sendSmtpEmail.sender = { 
      email: 'mayorde676@gmail.com', // Use your verified sender email
      name: 'ITHS 2011 Alumni Election' 
    };
    
    sendSmtpEmail.subject = `Vote Confirmation - ITHS 2011 Alumni Election`;
    
    // Create vote summary HTML
    const voteSummary = votes.map(vote => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${vote.position}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${vote.candidateName}</td>
      </tr>
    `).join('');

    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .vote-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .vote-table th { background: #495057; color: white; padding: 12px; text-align: left; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6c757d; }
          .success-badge { background: #28a745; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Vote Submitted Successfully</h1>
            <p>ITHS 2011 Alumni Election</p>
          </div>
          <div class="content">
            <div class="success-badge">
              Thank you for participating in the election!
            </div>
            
            <p>Dear <strong>${voterName}</strong>,</p>
            
            <p>Your vote has been successfully recorded. Here's a summary of your votes:</p>
            
            <table class="vote-table">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Candidate Voted For</th>
                </tr>
              </thead>
              <tbody>
                ${voteSummary}
              </tbody>
            </table>
            
            <p><strong>Total Positions Voted:</strong> ${votes.length}</p>
            <p><strong>Voter Email:</strong> ${voterEmail}</p>
            <p><strong>Submission Time:</strong> ${new Date().toLocaleString()}</p>
            
            <p style="margin-top: 20px;">
              <em>This is an automated confirmation. Please do not reply to this email.</em>
            </p>
          </div>
          <div class="footer">
            <p>ITHS 2011 Alumni Election System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log('📤 Attempting to send email via Brevo...');
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log('✅ Brevo API Response:', JSON.stringify(data, null, 2));
    console.log('✅ Vote confirmation email sent to:', voterEmail);
    
    return { success: true, data };

  } catch (error) {
    console.error('❌ Vote confirmation email error:');
    console.error('   Error message:', error.message);
    console.error('   Error status:', error.status);
    console.error('   Error code:', error.code);
    console.error('   Error response body:', error.response?.body);
    console.error('   Error response text:', error.response?.text);
    console.error('   Full error:', error);
    
    return { success: false, error: error.message };
  }
};

// Send notification to committee
export const sendCommitteeVoteNotification = async ({ voterName, voterEmail, totalVotes, positions }) => {
  try {
    console.log('📧 Sending vote notification to committee...');

    const recipientEmails = [
      process.env.COMMITTEE_EMAIL_1,
      process.env.COMMITTEE_EMAIL_2,
      process.env.COMMITTEE_EMAIL_3
    ].filter(email => email && email.trim() !== '');

    console.log('📧 Committee emails to notify:', recipientEmails);

    if (recipientEmails.length === 0) {
      console.warn('❌ No committee emails configured in environment variables');
      console.warn('   COMMITTEE_EMAIL_1:', process.env.COMMITTEE_EMAIL_1);
      console.warn('   COMMITTEE_EMAIL_2:', process.env.COMMITTEE_EMAIL_2);
      console.warn('   COMMITTEE_EMAIL_3:', process.env.COMMITTEE_EMAIL_3);
      return { success: false, error: 'No committee emails configured' };
    }

    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.to = recipientEmails.map(email => ({ email }));
    
    sendSmtpEmail.sender = { 
      email: 'mayorde676@gmail.com', // Use your verified sender email
      name: 'ITHS 2011 Election System' 
    };
    
    sendSmtpEmail.subject = `New Votes Submitted - ${voterName}`;
    
    const positionsList = positions.map(pos => `<li>${pos}</li>`).join('');

    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-item { margin-bottom: 15px; padding: 10px; background: white; border-radius: 5px; }
          .label { font-weight: bold; color: #495057; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🗳️ New Votes Submitted</h1>
            <p>ITHS 2011 Alumni Election</p>
          </div>
          <div class="content">
            <div class="info-item">
              <span class="label">Voter Name:</span> ${voterName}
            </div>
            <div class="info-item">
              <span class="label">Voter Email:</span> ${voterEmail}
            </div>
            <div class="info-item">
              <span class="label">Total Votes:</span> ${totalVotes}
            </div>
            <div class="info-item">
              <span class="label">Positions Voted:</span>
              <ul>
                ${positionsList}
              </ul>
            </div>
            <div class="info-item">
              <span class="label">Submission Time:</span> ${new Date().toLocaleString()}
            </div>
          </div>
          <div class="footer">
            <p>Automated notification from ITHS 2011 Alumni Election System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log('📤 Attempting to send committee notification via Brevo...');
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log('✅ Brevo API Response for committee:', JSON.stringify(data, null, 2));
    console.log(`✅ Committee notification sent to ${recipientEmails.length} recipients`);
    
    return { success: true, data };

  } catch (error) {
    console.error('❌ Committee notification email error:');
    console.error('   Error message:', error.message);
    console.error('   Error status:', error.status);
    console.error('   Error code:', error.code);
    console.error('   Error response body:', error.response?.body);
    console.error('   Error response text:', error.response?.text);
    console.error('   Full error:', error);
    
    return { success: false, error: error.message };
  }
};