const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/user');

const userService = require('../services/userService');
const authService = require('../services/authService');
const emailService = require('../services/emailService');
const { uploadToS3 } = require('../services/s3Service');
const { OAuth2Client } = require('google-auth-library');
const { auth } = require('../middleware/auth');
const router = new express.Router();



/**
 * Check if a user exists in the database
 * @route POST /presignup
 * @param {Object} req.body - The user data to check
 * @returns {Object} 200 - A success status and a message indicating the user does not exist
 * @returns {Object} 409 - A conflict status and an error message indicating the user already exists
 */
router.post('/presignup', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await userService.findByEmail(email);
        
        if (user) {
            return res.status(409).send({ message: 'User already exists' });
        }
        
        res.status(200).send({ message: 'User does not exist' });
    } catch (e) {
        res.status(500).send({ message: 'Something went wrong' });
    }
});


/**
 * Sign up a new user
 * @route POST /signup
 * @param {Object} req.body - The user data for sign up
 * @returns {Object} 201 - A success status, the new user object, the token, and a success message
 * @returns {Object} 401 - An unauthorized status and an error message
 */
router.post('/signup', async (req, res) => {
    // Use the userService to create a new user
    try {
        const newUser = await userService.createUser(req.body);
        // Send a confirmation email using the emailService
        const emailOptions = emailService.generateConfirmationEmail(newUser);
        // Generate an authentication token using authService
        const token = await authService.generateAuthToken(newUser);
        emailService.sendEmail(emailOptions.to, emailOptions.subject, emailOptions.text);
        res.status(201).send({ newUser, token, message: 'User created' });
    } catch (e) {
        console.error(e);
        res.status(401).send({ message: e.message });
    }
});


/**
 * Log in a user (Tested)
 * @route POST /login
 * @param {Object} req.body - The request body containing the user's email and password
 * @returns {Object} 200 - A success status, the user object, the token, and a success message
 * @returns {Object} 500 - An internal server error status and an error message
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userService.findByCredentials(email, password);
        
        if (!user) {
            return res.status(401).send({ message: 'Invalid email or password' });
        }
        
        const token = await authService.generateAuthToken(user);
        res.status(200).send({ user, token, message: 'User logged in successfully' });
    } catch (e) {
        res.status(500).send({ message: 'Something went wrong' });
    }
})


/**
 * Edit/Update a User details
 * @route PATCH /edit-users-profile
 * @param {Object} req.body - The user data
 * @returns {Object} 201 - A success status, the new user object, the token, and a success message
 * @returns {Object} 400 - An unauthorized status and an error message
 */
router.patch('/edit-users-profile', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['fullName', 'bio', 'gender', 'profilePhoto', 'location', 'birthday'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));
    
    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' });
    }
    
    try {
        const user = req.user;

        if (!user) {
            return res.status(404).send();
        }

        updates.forEach((update) => user[update] = req.body[update]);
        await user.save();

        res.send(user);
    } catch (e) {
        res.status(400).send(e);
    }
});


/**
 * Authenticate a user with Google
 * @route POST /google-auth
 * @param {Object} req.body - The request body containing the Google ID token
 * @returns {Object} 200 - A success status, the user object, the token, and a success message
 * @returns {Object} 401 - An unauthorized status and an error message
 */
router.post('/google-auth', async (req, res) => {
    try {
        // Get Google token
        const idToken = await getGoogleIdToken(req.body.code)
        // Verify the Google token
        const payload = await verifyGoogleToken(idToken);
        // Extract user information from the payload
        const { email, name, picture } = payload;
        // Check if the user already exists in the database
        let user = await userService.getUserByEmail(email);

        if (!user) {
            const newUser = {
                email,
                fullName: name,
                password: bcrypt.hashSync(generatePassword(16), 8),
                profilePhoto: {
                    key: '',
                    location: picture,
                },
                isEmailConfirmed: true,
            };

            user = await userService.createUser(newUser);
        }

        if (user.isEmailConfirmed === false) {
            user.isEmailConfirmed = true;
            await user.save();
        }

        const token = await authService.generateAuthToken(user);
        res.status(200).send({ user, token, message: 'User logged in with Google' });
    } catch (e) {
        res.status(500).send({ message: 'Something went wrong with Google authentication' });
    }
});


/**
 * Request a new verification email (for logged-in users) (Tested)
 * @route POST /request-verification-email-logged-in
 * @middleware auth - The authentication middleware
 * @returns {Object} 200 - A success status and a success message
 * @returns {Object} 400 - A bad request status and an error message
 * @returns {Object} 401 - An unauthorized status and an error message
 * @returns {Object} 500 - An internal server error status and an error message
 */
router.post('/request-verification-email', auth, async (req, res) => {
    try {
        const user = req.user;

        if (user.isEmailConfirmed) {
            return res.status(400).send({ message: 'Email is already confirmed' });
        }

        emailService.sendConfirmationEmail(user);
        res.status(200).send({ message: 'Verification email sent' });

    } catch (e) {
        res.status(500).send({ message: 'Something went wrong' });
    }
});


/**
 * Confirm a user's email address (Tested)
 * @route GET /confirm-email/:token
 * @param {string} req.params.token - The email confirmation token
 * @returns {Object} 200 - A success status and a success message
 * @returns {Object} 400 - A bad request status and an error message
 * @returns {Object} 404 - A not found status and an error message
 */
router.get('/confirm-email/:token', async (req, res) => {
    try {
        const token = req.params.token;
        console.log(token);
        // Verify the email confirmation token
        const decoded = jwt.verify(token, process.env.EMAIL_CONFIRM_SECRET_KEY)
        console.log(decoded);
        
        const allUsers = await User.find();
        console.log('All users:', allUsers);

        const user = await User.findOne({ _id: decoded._id, emailConfirmToken: token });
        console.log(user)
        if (!user) {
            return res.status(404).send({ message: 'Token not found or expired' });
        }

        // Update the user's email confirmation status
        user.isEmailConfirmed = true;
        user.emailConfirmToken = null;
        await user.save();
        
        res.status(200).send({ message: 'Email confirmed successfully' });
    } catch (e) {
        res.status(400).send({ "message": "Email failed to verify" })
    }
})


/**
 * Request a password reset email
 * @route POST /password-reset
 * @param {Object} req.body - The request body containing the user's email address
 * @returns {Object} 200 - A success status and a success message
 * @returns {Object} 500 - An internal server error status and an error message
 */
router.post('/password-reset', async (req, res) => {
    try {
        const email = req.body.email;
        const user = await userService.getUserByEmail(email);

        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }

        const resetToken = authService.generatePasswordResetToken(user);
        console.log(resetToken);
        await userService.savePasswordResetToken(user, resetToken);

        emailService.sendPasswordResetEmail(user, resetToken);
        res.status(200).send({ message: 'Password reset email sent' });
    } catch (e) {
        res.status(500).send({ message: 'Something went wrong' });
    }
})


/**
 * Reset a user's password (Tested)
 * @route POST /reset-password/:resetToken
 * @param {string} req.params.resetToken - The password reset token
 * @param {Object} req.body - The request body containing the new password
 * @returns {Object} 200 - A success status and a success message
 * @returns {Object} 500 - An internal server error status and an error message
 */
router.post('/reset-password/:resetToken', async (req, res) => {
    try {
        const resetToken = req.params.resetToken;
        const newPassword = req.body.newPassword;
        
        const decoded = authService.verifyPasswordResetToken(resetToken);
        const user = await userService.findUserById(decoded._id);

        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }

        await userService.updateUserPassword(user, newPassword);
        res.status(200).send({ message: 'Password updated successfully' });
    } catch (e) {
        res.status(500).send({ message: 'Something went wrong' });
    }
})


/**
 * Log out a user by removing the current authentication token (Tested)
 * @route POST /logout
 * @middleware auth - The authentication middleware
 * @returns {Object} 200 - A success status and a success message
 * @returns {Object} 500 - An internal server error status and an error message
 */
router.post('/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token;
        });
        await req.user.save();
        res.status(200).send({ message: 'User logged out' });
    } catch (e) {
        res.status(500).send({ message: 'Something went wrong' })
    }
})


/**
 * Log out a user from all devices by removing all authentication tokens (Tested)
 * @route POST /logout-all
 * @middleware auth - The authentication middleware
 * @returns {Object} 200 - A success status and a success message
 * @returns {Object} 500 - An internal server error status and an error message
 */
router.post('/logout-all', auth, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()
        res.status(200).send({ message: 'User logged out from all devices' });
    } catch (e) {
        res.status(500).send({ message: 'Something went wrong' });
    }
})


/**
 * Get the profile of the currently logged-in user (Tested)
 * @route GET /me
 * @middleware auth - The authentication middleware
 * @returns {Object} 200 - A success status and the user object
 * @returns {Object} 500 - An internal server error status and an error message
 */
router.get('/me', auth, async (req, res) => {
    try {
        res.status(200).send(req.user);
    } catch (error) {
        res.status(500).send({ message: 'Something went wrong' });
    }
})


/**
 * Change the password of the currently logged-in user (Tested)
 * @route PATCH /me/change-password
 * @middleware auth - The authentication middleware
 * @param {Object} req.body - The request body containing the current and new passwords
 * @returns {Object} 200 - A success status and a success message
 * @returns {Object} 400 - A bad request status and an error message
 * @returns {Object} 500 - An internal server error status and an error message
 */
router.patch('/me/change-password', auth, async (req, res) => {
    try {
        const oldPassword = req.body.oldPassword;
        const newPassword = req.body.newPassword;
        
        // Check if the current password is correct
        const isMatch = await userService.comparePasswords(req.user, oldPassword);

        if (!isMatch) {
            return res.status(400).send({ message: 'Current password is incorrect' });
        }

        await userService.updateUserPassword(req.user, newPassword);
        res.status(200).send({ message: 'Password updated successfully' });
    } catch (e) {
        res.status(500).send({ message: 'Something went wrong' }); 
    }
})


/**
 * Set a display picture for the user
 * @route POST /me/profile-photo
 * @middleware auth - The authentication middleware
 * @param {Object} req.body - The request body containing the image data
 * @returns {Object} 200 - A success status, the updated user object, and a success message
 * @returns {Object} 400 - A bad request status and an error message
 * @returns {Object} 500 - An internal server error status and an error message
 */
router.post('/me/profile-photo', auth, express.json({ limit: '10mb' }), async (req, res) => {
    try {
        const user = req.user;
        const imageData = req.body.imageData;
        
        if (!imageData) {
            return res.status(400).send({ message: 'No image data provided' });
        }

        const buffer = Buffer.from(imageData, 'base64');
        const key = `profile-photos/${user._id}-${Date.now()}.jpg`;
        
        try {
            const data = await uploadToS3(buffer, key, 'image/jpeg');
            const updatedUser = await userService.setProfilePhoto(user, data);
            res.status(200).send({ updatedUser, message: 'Profile photo updated' });
        } catch (err) {
            res.status(500).send({ message: 'Something went wrong' });
        }

    } catch(e) {
        res.status(500).send({ message: 'Something went wrong' });
    }
})


/**
 * Get the details of a specific user by their uniqueURL (Tested)
 * @route GET /users/:uniqueURL
 * @middleware auth - The authentication middleware
 * @param {string} req.params.uniqueURL - The uniqueURL of the user to retrieve
 * @returns {Object} 200 - A success status and the user object
 * @returns {Object} 404 - A not found status and an error message
 * @returns {Object} 500 - An internal server error status and an error message
 */
router.get('/users/:uniqueURL', async (req, res) => {
    try {
        const user = await userService.findUserByUniqueURL(req.params.uniqueURL);
        
        if (!user) {
            return res.status(404).send({ message: 'User not found' });
        }
        
        res.send(user);
    } catch (e) {
        res.status(500).send({ message: 'Something went wrong' });
    }
});



// Initialize Google OAuth2 client
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const client = new OAuth2Client(CLIENT_ID);
const oAuth2Client = new OAuth2Client(
    CLIENT_ID,
    CLIENT_SECRET,
    'postmessage',
);

// Define an async function to verify the Google token
const getGoogleIdToken = async (code) => {
    const { tokens } = await oAuth2Client.getToken(code); // exchange code for tokens
    return tokens.id_token;
};

// Define an async function to verify the Google token
const verifyGoogleToken = async (idToken) => {
    const ticket = await client.verifyIdToken({
        idToken,
        audience: CLIENT_ID,
    });
    return ticket.getPayload();
};

function generatePassword(length) {
    return crypto.randomBytes(length).toString('hex');
}


// Export the router
module.exports = router
