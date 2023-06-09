/**
* authServices.js
*
* This module provides utility functions for handling user authentication.
*/
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
require('dotenv').config()


/**
* Generate an authentication token for a user.
*
* @param {Object} user - The user object.
* @returns {Promise<string>} A promise that resolves to the generated JWT token.
*/
async function generateAuthToken(user) {
    const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET_KEY);
    user.tokens = user.tokens.concat({ token });
    await user.save();
    return token;
}


// Generate an email confirmation token using the user's ID and a secret key
// This function accepts a user object and returns a token with a 1-hour expiration time.
const generateEmailConfirmToken = (user) => {
    const token = jwt.sign(
        { _id: user._id.toString() }, // Payload: user's ID
        process.env.EMAIL_CONFIRM_SECRET_KEY, // Secret key for signing the token
        { expiresIn: '1h' } // Token expiration time: 1 hour
    );
    return token;
};


/**
 * Generates a password reset token for the given user.
 * The token contains the user's ID and has a limited validity period.
 * 
 * @param {Object} user - The user object for which the token will be generated.
 * @returns {string} - The generated password reset token.
 */
function generatePasswordResetToken(user) {
    const payload = { _id: user._id.toString() };

    // Set the token's expiration time (e.g., 1 hour)
    const options = { expiresIn: '1h' };

    // Generate the token using JWT
    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, options);

    return token;
}


/**
 * Verify the password reset token.
 *
 * @param {string} token - The password reset token to be verified.
 * @returns {Object} - The decoded payload if the token is valid.
 * @throws {Error} - If the token is invalid or expired.
 */
const verifyPasswordResetToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        return decoded;
    } catch (e) {
        throw new Error('Invalid or expired password reset token');
    }
};



module.exports = {
    generateAuthToken,
    generateEmailConfirmToken,
    generatePasswordResetToken,
    verifyPasswordResetToken
};
