const mongoose = require('mongoose');


/**
 * ActivityLog schema.
 *
 * @typedef Group
 * @property {ObjectId} groupId - The group's unique ID.
 * @property {ObjectId} userId - The users's unique ID.
 * @property {string} action - action done.
 */
const activityLogSchema = new mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Group'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    commentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: 'Comment'
    },
    meetingId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: 'Meeting'
    },
    action: {
        type: String,
        required: true,
        enum: ['request_sent', 'retracted_request', 'joined', 'left', 'request_approved', 'request_denied', 'removed', 'commented', 'edited_group'],
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
module.exports = ActivityLog;
