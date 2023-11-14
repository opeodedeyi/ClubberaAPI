// Import required packages
const mongoose = require('mongoose')


/**
 * Event schema representing social or business events.
 *
 * @typedef Event
 * @property {string} uniqueURL - Unique URL for the event, generated automatically from the event name.
 * @property {ObjectId} creator - Reference to the User who created the event.
 * @property {string} name - The name of the event.
 * @property {string} description - A brief description of the event.
 * @property {Object} banner - Object containing information about the event's banner image.
 * @property {string} banner.key - The unique identifier (key) for the photo in the AWS S3 bucket.
 * @property {string} banner.location - The full URL of the photo in the AWS S3 bucket.
 * @property {Object} location - An object containing detailed location information.
 * @property {string} location.place_id - The unique identifier for the event's location.
 * @property {string} location.formatted_address - The properly formatted address of the event's location.
 * @property {string} location.name - The name of the location.
 * @property {Array<string>} location.types - An array of strings representing different types of the location.
 * @property {Object} location.geo - An object containing the geographical coordinates of the location.
 * @property {string} location.geo.type - The type of the geographical point.
 * @property {Object} location.geo.coordinates - The geographical coordinates of the location.
 * @property {Number} location.geo.coordinates.lat - The latitude of the location.
 * @property {Number} location.geo.coordinates.lng - The longitude of the location.
 * @property {Date} eventDate - The date of the event.
 * @property {string} startTime - The starting time of the event.
 * @property {string} endTime - The ending time of the event.
 * @property {Number} slots - The number of slots available for the event.
 * @property {Array<Object>} attendees - An array of objects representing the attendees of the event.
 * @property {ObjectId} attendees.user - Reference to the User who will attend the event.
 * @property {boolean} attendees.attended - Indicates whether the user attended the event.
 */
const eventSchema = new mongoose.Schema({
    uniqueURL: {
        type: String,
        required: false,
        unique: true
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Group',
    },
    name: {
        type: String,
        required: true,
        maxlength: 50,
        trim: true,
        unique: false,
    },
    description: {
        type: String,
        required: false,
        maxlength: 500,
        trim: true,
    },
    banner: {
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
        place_id: {
            type: String,
            required: false,
        },
        formatted_address: {
            type: String,
            required: false,
        },
        name: {
            type: String,
            required: false,
        },
        types: {
            type: [String],
            required: false,
        },
        geo: {
            type: {
                type: String,
                enum: ['Point'],
                required: false,
            },
            coordinates: {
                lat: { type: Number, required: false },
                lng: { type: Number, required: false }
            },
        },
    },
    eventDate: {
        type: Date,
        required: true,
    },
    startTime: {
        type: String, // Consider using Date if you want to store in a complete datetime format
        required: true,
    },
    endTime: {
        type: String, // Consider using Date if you want to store in a complete datetime format
        required: true,
    },
    slots: {
        type: Number,
        required: true,
    },
    attendees: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
                ref: 'User',
            },
            attended: {
                type: Boolean,
                required: false,
                default: false,
            },
        },
    ],
}, {
    timestamps: true,
});


/**
 * Middleware to generate uniqueURL for the user
 */
eventSchema.pre('save', function (next) {
    if (!this.isModified('name')) {
        return next();
    }

    // Generate the unique URL (slug)
    this.uniqueURL = this.name.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();

    next();
});


// Create the Event model using the event schema
const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
