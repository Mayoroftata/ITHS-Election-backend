import brevo from 'sib-api-v3-sdk';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 Testing Brevo API...');
console.log('🔑 API Key present:', !!process.env.BREVO_API_KEY);

const defaultClient = brevo.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new brevo.TransactionalEmailsApi();

async function testBrevo() {
  try {
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    
    sendSmtpEmail.to = [{ email: 'objmak@gmail.com' }]; // Use your email
    sendSmtpEmail.sender = { 
      email: 'mayorde676@gmail.com', 
      name: 'ITHS Test' 
    };
    sendSmtpEmail.subject = 'Test Email from Brevo';
    sendSmtpEmail.htmlContent = '<strong>This is a test email from Brevo!</strong>';
    
    console.log('📤 Sending test email...');
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', data.messageId);
    console.log('   Check your Brevo dashboard and email inbox');
    
  } catch (error) {
    console.log('❌ Brevo test failed:');
    console.log('   Error:', error.message);
    console.log('   Status:', error.status);
    console.log('   Response:', error.response?.body);
  }
}

testBrevo();