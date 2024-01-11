const mongoose = require('mongoose');


/**
 * Group schema representing social clubs.
 *
 * @typedef Group
 * @property {string} uniqueURL - The group's unique URL.
 * @property {ObjectId} owner - Reference to the User who created the group.
 * @property {string} title - The name of the group.
 * @property {string} tagline - The tagline the group.
 * @property {string} description - A brief description of the group.
 * @property {string} banner - The URL of the group's banner image.
 * @property {Object} location - An object containing location information.
 * @property {string} topics - The category of the group.
 * @property {Array<ObjectId>} members - An array of references to User documents representing group members.
 * @property {Array<ObjectId>} requests - An array of references to User documents representing join requests.
 * @property {boolean} isPrivate - Indicates if permission is required to join the group.
 */
const groupSchema = new mongoose.Schema({
    uniqueURL: {
        type: String,
        required: false,
        unique: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    title: {
        type: String,
        required: true,
        maxlength: 50,
        trim: true,
    },
    tagline: {
        type: String, 
        required: false,
        maxlength: 150,
        trim: true,
    },
    description: {
        type: String,
        required: false,
        maxlength: 500,
        trim: true,
    },
    banner: {
        provider: {
            type: String,
            required: false, // aws, google, azure, etc.
        },
        key: {
            type: String,
            required: false, // The unique identifier (key) for the photo in the AWS S3 bucket
        },
        location: {
            type: String,
            required: false,  // The full URL of the photo in the AWS S3 bucket
        },
    },
    location: {
        city: {
            type: String,
            required: false,
        },
        lat: {
            type: Number,
            required: false,
        },
        lng: {
            type: Number,
            required: false,
        },
    },
    topics: {
        type: [String],
        required: false,
    },
    members: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
            ref: 'User',
        },
    ],
    requests: [
        {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
            ref: 'User',
        },
    ],
    bannedUsers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    isPrivate: {
        type: Boolean,
        required: false,
        default: false,
    }
}, {
    timestamps: true,
});


// Add a 2dsphere index for the location.geo field
groupSchema.index({
    name: 'text',
    'location.city': 'text',
    'description': 'text',
    'categories': 'text',
});


/**
 * Middleware to generate uniqueURL for the user
 */
groupSchema.pre('save', function (next) {
    if (!this.isModified('title')) {
        return next();
    }

    this.uniqueURL = this.title.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();
    next();
});


const Group = mongoose.model('Group', groupSchema);
module.exports = Group;
