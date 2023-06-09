// Import required modules
const nodemailer = require('nodemailer')
const jwt = require('jsonwebtoken')
require('dotenv').config()


// Extract environment variables
const {
    COMPANY_NAME,
    NODEMAILER_EMAIL,
    NODEMAILER_PASS,
    COMPANY_WEBSITE,
    JWT_SECRET_KEY
} = process.env;


// Configure the nodemailer transporter with the provided settings
const transporter = nodemailer.createTransport({
    host: 'smtpout.secureserver.net',
    secure: true,
    secureConnection: false,
    tls: {
        ciphers: 'SSLv3'
    },
    requireTLS: true,
    port: 465,
    debug: true,
    auth: {
        user: NODEMAILER_EMAIL,
        pass: NODEMAILER_PASS
    }
});


/**
 * Sends an email using the nodemailer transporter.
 * @param {string} to - Recipient's email address.
 * @param {string} subject - Email subject.
 * @param {string} html - Email content in HTML format.
 */
const sendEmail = async (to, subject, html) => {
    try {
        await transporter.sendMail({
            from: `${COMPANY_NAME} <${NODEMAILER_EMAIL}>`,
            to,
            subject,
            html
        });
        console.log('Email Sent');
    } catch (error) {
        console.log('Email not sent', error);
    }
};


/**
 * Sends a confirmation email to the user.
 * @param {Object} user - User object containing user details.
 */
const sendConfirmationEmail = async (user) => {
    const token = jwt.sign({ _id: user._id.toString() }, JWT_SECRET_KEY, { expiresIn: '1h' });
    const url = `https://${COMPANY_WEBSITE}/confirmation/${token}`;
    const to = `${user.fullname} <${user.email}>`;

    const html = `
        <!DOCTYPE html>
        <html>
        <header>
            <title>Confirmation email</title>
        </header>
        
        <body style="background-color: #E9ECF2;">
        <center>
            <table style="color: #627085;
                        font-family: 'ProximaNova-Regular', Helvetica, Arial, sans-serif;
                        max-width:500px;">
        
            </table>
            <table style="background-color: #fff;
                            font-family: 'ProximaNova-Regular', Helvetica, Arial, sans-serif;
                            font-size: 0.9rem;
                            color: #627085;
                            max-width:500px;
                            border-radius:4px;
                            margin: 20px 20px 20px 20px;
                            padding: 40px;
                            box-shadow:0 1px 3px #B7C0CC, 0 1px 2px #B7C0CC;">
            <tr>
                <td style="font-size: 1.4rem;
                padding-top:20px;padding-bottom:20px;">Please confirm your email!</td>
            </tr>
            <tr>
                <td style="padding-top:20px;padding-bottom:20px;padding-bottom:20px;margin-bottom:10px;">Hey ${user.fullname},</td>
            </tr>
            <tr style="padding-top:5px;padding-bottom:20px;">
                <td style="padding-bottom:10px;margin-bottom:10px;">We're excited to have you get started. First, you need to confirm your account. Just press the button below and get verified. The link will expire in 1 hour.</td>
            </tr>
                
            <tr style="padding-top:40px;padding-bottom:30px;">
                <td style="padding-bottom:10px;margin-bottom:10px;">Sincerely,</td>
            </tr>
            <tr><td>${COMPANY_NAME}</td></tr>
            <tr>
                <td style="padding-top:40px;"><a href="${url}"><input value="Confirm Email" type="button" style="background: #4D69B4;
                padding: 15px 40px;
                border-radius: 22.2px;
                border: none;
                color:#fff;
                font-size:0.9rem;
                cursor:pointer"/>
                </a>
                </td>
            </tr>
            </table>
        </center>
        </body>
        
        </html>
    `;

    await sendEmail(to, 'Verify Your Email', html);
};


/**
 * Sends a password reset email to the user.
 * @param {Object} user - User object containing user details.
 */
const sendPasswordResetEmail = async (user) => {
    const token = jwt.sign({ _id: user._id.toString() }, JWT_SECRET_KEY, { expiresIn: '1h' });
    const url = `https://${COMPANY_WEBSITE}/resetpassword/${token}`;
    const to = `${user.fullname} <${user.email}>`;

    const html = `
        <!DOCTYPE html>
        <html>
        <header>
            <title>Password reset</title>
        </header>
        
        <body style="background-color: #E9ECF2;">
        <center>
            <table style="color: #627085;
                        font-family: 'ProximaNova-Regular', Helvetica, Arial, sans-serif;
                        max-width:500px;">
        
            </table>
            <table style="background-color: #fff;
                            font-family: 'ProximaNova-Regular', Helvetica, Arial, sans-serif;
                            font-size: 0.9rem;
                            color: #627085;
                            max-width:500px;
                            border-radius:4px;
                            margin: 20px 20px 20px 20px;
                            padding: 40px;
                            box-shadow:0 1px 3px #B7C0CC, 0 1px 2px #B7C0CC;">
            <tr>
                <td style="padding-top:20px;
                        padding-bottom:10px;">Hey ${user.fullname},</td>
            </tr>
            <tr>
                <td style="font-size: 1.4rem;
                padding-top:20px;padding-bottom:20px;margin-bottom:20px;">You have requested to reset your password</td>
            </tr>
            
            <tr style="padding-top:20px;padding-bottom:20px;margin-bottom:20px;">
                <td style="padding-bottom:10px;margin-bottom:10px;">A unique link to reset your password has been generated for you. To reset your password, click the following button below and follow the instructions. The link will expire in 24 hours.</td>
            </tr>

            <tr style="padding-top:20px;padding-bottom:20px;margin-bottom:20px;">
                <td style="padding-bottom:10px;margin-bottom:10px;">If you didnt request this to reset your password, Please ignore this message.</td>
            </tr>
                
            <tr style="padding-top:40px;padding-bottom:30px;">
                <td>Sincerely,</td>
            </tr>
            <tr><td>${COMPANY_NAME}</td></tr>
            <tr>
                <td style="padding-top:40px;"><a href="${url}"><input value="Reset Password" type="button" style="background: #4D69B4;
                padding: 15px 40px;
                border-radius: 22.2px;
                border: none;
                color:#fff;
                font-size:0.9rem;
                cursor:pointer;" />
                </a>
                </td>
            </tr>
            </table>
        </center>
        </body>
        
        </html>
    `;

    await sendEmail(to, 'Reset Your Password', html);
};


/**
 * Sends a report user email to the company.
 * @param {Object} user - User object containing user details.
 * @param {Object} repo - Reporter object containing reporter details.
 * @param {string} body - Report message.
 */
const reportUser = async (user, repo, body) => {
    const to = `${COMPANY_NAME} <lookaamdotcom@gmail.com>`;
    const html = `
        <!DOCTYPE html>
        <html>
        <header>
        <title>Event center</title>
        </header>
        
        <body style="background-color: #E9ECF2;">
        <center>
            <table style="color: #627085;
                        font-family: 'ProximaNova-Regular', Helvetica, Arial, sans-serif;
                        max-width:500px;">
        
            </table>
            <table style="background-color: #fff;
                            font-family: 'ProximaNova-Regular', Helvetica, Arial, sans-serif;
                            font-size: 0.9rem;
                            color: #627085;
                            max-width:500px;
                            border-radius:4px;
                            margin: 20px 20px 20px 20px;
                            padding: 40px;
                            box-shadow:0 1px 3px #B7C0CC, 0 1px 2px #B7C0CC;">
            <tr>
                <td style="font-size: 1.4rem;
                padding-top:20px;padding-bottom:20px;">${repo.email}</td>
            </tr>
            <tr>
                <td style="padding-top:20px;
                        padding-bottom:10px;">Hello There,</td>
            </tr>
            <tr style="padding-top:5px;padding-bottom:20px;">
                <td style="padding-bottom:20px;margin-bottom:20px;">
                ${body}
                </td>
            </tr
                
            <tr style="padding-top:40px;padding-bottom:30px;">
                <td style="padding-bottom:10px;margin-bottom:10px;">Sincerely, ${COMPANY_NAME}</td>
            </tr>
            <tr><td style="padding-bottom:10px;margin-bottom:10px;">${repo.fullname}</td></tr>
            </table>
        </center>
        </body>
        
        </html>
    `;

    await sendEmail(to, 'Report a user', html);
};


// Export the functions for use in other modules
module.exports = {
    sendConfirmationEmail,
    sendPasswordResetEmail,
    reportUser
};
