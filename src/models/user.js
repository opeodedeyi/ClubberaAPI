// Import required packages
const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')

// Load environment variables
require('dotenv').config()


/**
 * User schema representing a user.
 *
 * @typedef {Object} User
 * @property {string} fullname - The full name of the user.
 * @property {string} email - The user's email address.
 * @property {string} password - The user's password.
 * @property {string} gender - The user's gender.
 * @property {Array} interests - An array of category IDs representing the user's interests.
 * @property {Array} moderatorInvitations - An array of group IDs representing the moderator request to the user.
 * @property {Object} profilePhoto - An object containing the key and location of the user's profile photo.
 * @property {boolean} isEmailConfirmed - Indicates if the user's email is confirmed.
 * @property {boolean} isVerified - Indicates if the user is verified.
 * @property {boolean} isAdmin - Indicates if the user is an admin.
 * @property {boolean} isActive - Indicates if the user's account is active.
 * @property {string} emailConfirmToken - The email confirmation token for the user.
 * @property {string} passwordResetToken - The password reset token for the user.
 * @property {Array} tokens - An array of authentication tokens for the user.
 */
const userSchema = new mongoose.Schema({
    fullname: {
        type: String, 
        required: true,
        trim: true,
        lowercase: true,
        index: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('Email is invalid');
            }
        },
        index: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        trim: true,
        select: false // Exclude the password field when querying users
    },    
    gender: {
        type: String,
        enum: ['male', 'female', 'non-binary', 'prefer not to say', 'other'],
        default: 'prefer not to say',
        required: false,
        set: (value) => value.toLowerCase(), // Convert the input to lowercase
    },
    interests: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category'
        }],
        default: [],
        required: false
    },
    moderatorInvitations: [
        {
            group: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Group',
            },
            sentAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    profilePhoto: {
        key: {
            type: String,
            required: false, // The unique identifier (key) for the photo in the AWS S3 bucket
        },
        location: {
            type: String,
            required: false,  // The full URL of the photo in the AWS S3 bucket
        },
    },
    isEmailConfirmed: {
        type: Boolean,
        required: false,
        default: false
    },
    isVerified: {
        type: Boolean,
        required: false,
        default: false
    },
    isAdmin: {
        type: Boolean,
        required: false,
        default: false
    },
    isActive: {
        type: Boolean,
        required: false,
        default: true
    },
    emailConfirmToken: {
        type: String,
        required: false
    },
    passwordResetToken: {
        type: String,
        required: false
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }]
}, {
    timestamps: true
})


// Create a text index for the fullname field
userSchema.index({ fullname: 'text' });


/**
 * Custom toJSON method to remove sensitive fields from the output.
 */
userSchema.methods.toJSON = function () {
    const user = this
    const userObject = user.toObject()

    delete userObject.password
    delete userObject.tokens

    return userObject
}


/**
 * Middleware to hash the password before saving the user.
 */
userSchema.pre('save', async function (next) {
    const user = this

    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8)
    }

    next()
})


/**
 * Transformation function to remove sensitive fields.
 */
const userTransformation = function (doc, ret, options) {
    delete ret.password;
    delete ret.tokens;
    return ret;
}


// Apply the transformation function to the user schema
userSchema.set('toObject', { transform: userTransformation });
userSchema.set('toJSON', { transform: userTransformation });


// Create the User model using the user schema
const User = mongoose.model('User', userSchema);

module.exports = User;
