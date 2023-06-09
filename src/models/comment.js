const mongoose = require('mongoose');


/**
 * @module Comment
 * @typedef {Object} Comment
 * @property {string} content - The text of the comment.
 * @property {mongoose.Schema.Types.ObjectId} author - A reference to the user who created the comment.
 * @property {string} targetType - The type of the target model, e.g., 'Group' or 'Comment' for replying to a comment. This field can be extended with other model names if needed.
 * @property {mongoose.Schema.Types.ObjectId} targetId - The ID of the target model instance (either a Group or another Comment).
 * @property {Date} createdAt - A timestamp indicating when the comment was created.
 */
const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    targetType: {
        type: String,
        enum: ['Group', 'Comment'],
        required: true,
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});


const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
