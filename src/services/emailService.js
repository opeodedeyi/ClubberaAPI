/**
 * emailServices.js
 *
 * This module provides utility functions for sending confirmation and password reset emails.
 */
const sendMail = require('../services/sendmail');
const authService = require('./authService');
require('dotenv').config()


/**
 * Send a confirmation email to the user.
 *
 * @param {Object} user - The user object.
 */
function sendConfirmationEmail(user) {
    const token = authService.generateEmailConfirmToken(user);
    user.emailConfirmToken = token;
    user.save();
    const emailOptions = {
        to: user.email,
        subject: 'Email Confirmation',
        text: `Click on this link to confirm your email: ${process.env.CLIENT_URL}/confirmation/${token}`
    };

    sendMail(emailOptions);
}


/**
 * Send a password reset email to the user.
 * @param {Object} user - The user object.
 * @param {String} token - The password reset token.
 */
function sendPasswordResetEmail(user, token) {
    // Create email options for the password reset email
    const emailOptions = {
        to: user.email,
        subject: 'Password Reset',
        text: `Click on this link to reset your password: ${process.env.CLIENT_URL}/resetpassword/${token}`
    };

    sendMail(emailOptions);
}


module.exports = {
    sendConfirmationEmail,
    sendPasswordResetEmail
};
