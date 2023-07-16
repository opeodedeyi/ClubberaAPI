const User = require('../models/user');
const bcrypt = require('bcryptjs');


/**
 * Create a new user.
 * @param {Object} userData - The data for the new user.
 * @returns {Promise<User>} - The created user.
 * @throws {Error} - If the user with the given email already exists.
 */
async function createUser(userData) {
    const user = new User(userData);
    const userExists = await User.findOne({ email: userData.email });

    if (userExists) {
        throw new Error('User already exists');
    }

    await user.save();
    return user;
}


/**
 * Find a user by ID.
 * @param {string} userId - The user ID to search for.
 * @returns {Promise<User|null>} - The user found or null if not found.
 */
async function findUserById(userId) {
    return await User.findById(userId);
}


/**
 * Find a user by uniqueURL.
 * @param {string} uniqueURL - The user uniqueURL to search for.
 * @returns {Promise<User|null>} - The user found or null if not found.
 */
async function findUserByUniqueURL(uniqueURL) {
    return User.findOne({ uniqueURL: uniqueURL });
}


/**
 * Find a user by email and password.
 * 
 * @param {String} email - The email of the user.
 * @param {String} password - The password of the user.
 * @returns {Promise<Object>} The found user object.
 * @throws {Error} If no user is found or the password is incorrect.
 */
async function findByCredentials(email, password) {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        throw new Error('Invalid email or password');
    }

    const isMatch = await comparePasswords(user, password)

    if (!isMatch) {
        throw new Error('Invalid password');
    }
    return user;
}


/**
 * Find a user by email.
 * @param {string} email - The email address to search for.
 * @returns {Promise<User|null>} - The user found or null if not found.
 */
async function getUserByEmail(email) {
    return await User.findOne({ email });
}


/**
 * Update an existing user.
 * @param {User} user - The user to update.
 * @param {Object} updates - The updates to apply to the user.
 * @returns {Promise<void>} - Resolves when the user is updated.
 */
async function updateUser(user, updates) {
    Object.assign(user, updates);
    await user.save();
}


/**
 * Save the password reset token to the user's document.
 * @param {Object} user - The user object.
 * @param {String} token - The password reset token.
 * @returns {Promise<Object>} - A promise that resolves to the updated user document.
 * @throws {Error} - If an error occurs while saving the token.
 */
const savePasswordResetToken = async (user, token) => {
    try {
        // Set the passwordResetToken field in the user document
        user.passwordResetToken = token;
        // Save the updated user document to the database
        await user.save();
        // Return the updated user document
        return user;
    } catch (error) {
        // If an error occurs, throw the error
        throw error;
    }
};


/**
 * Update the user's password.
 *
 * @param {Object} user - The user object.
 * @param {string} newPassword - The new password to be set.
 * @returns {Promise} - A promise that resolves when the password is updated successfully.
 */
async function updateUserPassword(user, newPassword) {
    user.password = newPassword;
    await user.save();
}


/**
 * Compare the provided password with the hashed password stored for the user.
 *
 * @param {Object} user - The user object.
 * @param {String} password - The password to compare.
 * @returns {Boolean} - True if the passwords match, false otherwise.
 */
async function comparePasswords(user, password) {
    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch;
}


/**
 * Set the profile photo of the user.
 *
 * @param {Object} user - The user object.
 * @param {Object} s3Data - The S3 data object containing the key and location of the uploaded file.
 * @returns {Promise<Object>} - Returns a promise that resolves to the updated user object.
 */
const setProfilePhoto = async (user, s3Data) => {
    user.profilePhoto.key = s3Data.Key;
    user.profilePhoto.location = s3Data.Location;
    await user.save();
    return user;
};


module.exports = {
    createUser,
    findUserById,
    findUserByUniqueURL,
    findByCredentials,
    getUserByEmail,
    updateUser,
    savePasswordResetToken,
    updateUserPassword,
    comparePasswords,
    setProfilePhoto
};
