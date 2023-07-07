/**
 * emailServices.js
 *
 * This module provides utility functions for sending confirmation and password reset emails.
 */
const nodemailer = require('nodemailer')
const authService = require('./authService');
require('dotenv').config()


// Extract environment variables
const {
    COMPANY_NAME,
    NODEMAILER_EMAIL,
    NODEMAILER_PASS,
    COMPANY_WEBSITE,
} = process.env;

// Configure the nodemailer transporter with the provided settings
const transporter = nodemailer.createTransport({
    host: 'mail.privateemail.com',
    port: 465,
    secure: true, // use SSL
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
 * Send a confirmation email to the user.
 *
 * @param {Object} user - The user object.
 */
function sendConfirmationEmail(user) {
    const token = authService.generateEmailConfirmToken(user);
    console.log(token);
    user.emailConfirmToken = token;
    user.save();
    const emailOptions = {
        to: user.email,
        subject: 'Email Confirmation',
        text: `Click on this link to confirm your email: ${COMPANY_WEBSITE}/confirmation/${token}`
    };

    sendEmail(emailOptions.to, emailOptions.subject, emailOptions.text);
}


/**
 * Send a confirmation email to the user.
 *
 * @param {Object} user - The user object.
 */
function generateConfirmationEmail(user) {
    const token = authService.generateEmailConfirmToken(user);
    user.emailConfirmToken = token;
    const emailOptions = {
        to: user.email,
        subject: 'Email Confirmation',
        text: `Click on this link to confirm your email: ${COMPANY_WEBSITE}/confirmation/${token}`
    };
    return emailOptions;
}


/**
 * Send a password reset email to the user. (working)
 * @param {Object} user - The user object.
 * @param {String} token - The password reset token.
 */
function sendPasswordResetEmail(user, token) {
    // Create email options for the password reset email
    const emailOptions = {
        to: user.email,
        subject: 'Password Reset',
        text: `Click on this link to reset your password: ${COMPANY_WEBSITE}/resetpassword/${token}`
    };

    sendEmail(emailOptions.to, emailOptions.subject, emailOptions.text);
}


module.exports = {
    sendEmail,
    sendConfirmationEmail,
    sendPasswordResetEmail,
    generateConfirmationEmail
};
