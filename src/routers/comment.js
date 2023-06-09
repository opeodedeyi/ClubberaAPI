const express = require('express');
const { auth } = require('../middleware/auth');
const Comment = require('../models/comment');
const Group = require('../models/group');

const router = new express.Router();


/**
 * @api {post} /group/:groupId/comment Create a comment in a group
 * @apiName CreateGroupComment
 * @apiGroup Comment
 * @apiVersion 1.0.0
 *
 * @apiPermission member
 *
 * @apiDescription This endpoint allows a user to create a comment in a group if they are a member of that group
 * @apiParam (path) {String} groupId The ID of the group where the comment will be posted.
 * @apiParam (body) {String} content The content of the comment.
 *
 * @apiHeader {String} Authorization The user's access token.
 *
 * @apiSuccess (201) {String} The created comment.
 * @apiError (404) {String} error The error message indicating the group was not found.
 * @apiError (403) {String} error The error message indicating the user must be a member of the group to comment.
 * @apiError (400) {String} error The error message indicating a bad request.
 */
router.post('/group/:groupId/comment', auth, async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }

        const isMember = group.members.some((memberId) => memberId.equals(req.user._id));

        if (!isMember) {
            return res.status(403).send({ error: 'You must be a member of this group to comment' });
        }

        const comment = new Comment({
            ...req.body,
            targetType: 'Group',
            targetId: group._id,
            author: req.user._id,
        });

        await comment.save();
        res.status(201).send(comment);
    } catch (e) {
        res.status(400).send(e);
    }
});


/**
 * @api {post} /comment/:commentId/reply Reply to a comment to a group
 * @apiName ReplyToComment
 * @apiGroup Comment
 * @apiVersion 1.0.0
 *
 * @apiParam {String} commentId Parent comment's unique ID.
 *
 * @apiParam (Request body) {String} content The content of the reply.
 *
 * @apiSuccess {String} _id Unique ID of the created reply.
 * @apiSuccess {String} content Content of the created reply.
 * @apiSuccess {String} author Unique ID of the user who created the reply.
 * @apiSuccess {String} targetType The type of the target entity (Comment in this case).
 * @apiSuccess {String} targetId Unique ID of the parent comment.
 * @apiSuccess {Date} createdAt Timestamp of the created reply.
 *
 * @apiError (Error 404) {String} error 'Comment not found' or 'Group not found'.
 * @apiError (Error 403) {String} error 'You must be a member of this group to reply to a comment'.
 * @apiError (Error 400) {Object} e Error object with details.
 */
router.post('/comment/:commentId/reply', auth, async (req, res) => {
    try {
        const parentComment = await Comment.findById(req.params.commentId).populate('targetId');

        if (!parentComment) {
            return res.status(404).send({ error: 'Comment not found' });
        }

        const group = await Group.findById(parentComment.targetId);

        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }

        const isMember = group.members.some((memberId) => memberId.equals(req.user._id));

        if (!isMember) {
            return res.status(403).send({ error: 'You must be a member of this group to reply to a comment' });
        }

        const reply = new Comment({
            ...req.body,
            targetType: 'Comment',
            targetId: parentComment._id,
            author: req.user._id,
        });

        await reply.save();
        res.status(201).send(reply);
    } catch (e) {
        res.status(400).send(e);
    }
});


/**
 * @api {delete} /comment/:commentId Delete a comment
 * @apiName DeleteComment
 * @apiGroup Comment
 * @apiVersion 1.0.0
 *
 * @apiParam {String} commentId Comment's unique ID.
 *
 * @apiSuccess {String} message 'Comment deleted'.
 *
 * @apiError (Error 404) {String} error 'Comment not found'.
 * @apiError (Error 403) {String} error 'You do not have permission to delete this comment'.
 * @apiError (Error 400) {String} error 'Cannot delete a comment with replies'.
 * @apiError (Error 500) {String} error 'Server error'.
 */
router.delete('/comment/:commentId', auth, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);

        if (!comment) {
            return res.status(404).send({ error: 'Comment not found' });
        }

        if (!comment.author.equals(req.user._id)) {
            return res.status(403).send({ error: 'You do not have permission to delete this comment' });
        }

        const replies = await Comment.find({ targetType: 'Comment', targetId: comment._id });

        if (replies.length > 0) {
            return res.status(400).send({ error: 'Cannot delete a comment with replies' });
        }

        await Comment.findByIdAndDelete(comment._id);
        res.status(200).send({ message: 'Comment deleted' });
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


/**
 * @api {delete} /admin-delete-comment/:commentId Delete a comment and its replies
 * @apiName DeleteCommentAndReplies
 * @apiGroup Comment
 * @apiVersion 1.0.0
 *
 * @apiParam {String} groupId Group's unique ID.
 * @apiParam {String} commentId Comment's unique ID.
 *
 * @apiSuccess {String} message 'Comment and its replies deleted'.
 *
 * @apiError (Error 404) {String} error 'Group not found'.
 * @apiError (Error 404) {String} error 'Comment not found'.
 * @apiError (Error 403) {String} error 'You do not have permission to delete this comment'.
 * @apiError (Error 500) {String} error 'Server error'.
 */
router.delete('/admin-delete-comment/:commentId', auth, async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);

        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }

        const comment = await Comment.findById(req.params.commentId);

        if (!comment) {
            return res.status(404).send({ error: 'Comment not found' });
        }

        const isOwner = group.owner.equals(req.user._id);
        const isModerator = group.moderators.some((moderatorId) => moderatorId.equals(req.user._id));

        if (!isOwner && !isModerator) {
            return res.status(403).send({ error: 'You do not have permission to delete this comment' });
        }

        await Comment.deleteMany({ targetType: 'Comment', targetId: comment._id });
        await Comment.findByIdAndDelete(comment._id);

        res.status(200).send({ message: 'Comment and its replies deleted' });
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


/**
 * @api {get} /group/:groupId/comments Get all comments for a group
 * @apiName GetGroupComments
 * @apiGroup Comment
 * @apiVersion 1.0.0
 *
 * @apiParam {String} groupId Group's unique ID.
 * @apiParam {Number} [page=1] Page number for pagination.
 * @apiParam {Number} [limit=10] Number of comments per page.
 * @apiParam {String} [sortBy=createdAt] Field to sort comments by.
 * @apiParam {String} [order=desc] Sorting order ('asc' or 'desc').
 *
 * @apiSuccess {Object[]} comments List of comments.
 *
 * @apiError (Error 404) {String} error 'Group not found'.
 * @apiError (Error 500) {String} error 'Server error'.
 */
router.get('/group/:groupId/comments', async (req, res) => {
    const groupId = req.params.groupId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sortBy = req.query.sortBy || 'createdAt';
    const order = req.query.order === 'asc' ? 1 : -1;

    try {
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }

        const comments = await Comment.find({ targetType: 'Group', targetId: groupId })
            .sort({ [sortBy]: order })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).send(comments);
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


/**
 * @api {get} /comment/:commentId/replies Get all replies for a comment
 * @apiName GetCommentReplies
 * @apiGroup Comment
 * @apiVersion 1.0.0
 *
 * @apiParam {String} commentId Comment's unique ID.
 * @apiParam {Number} [page=1] Page number for pagination.
 * @apiParam {Number} [limit=10] Number of replies per page.
 *
 * @apiSuccess {Object[]} replies List of replies.
 *
 * @apiError (Error 404) {String} error 'Comment not found'.
 * @apiError (Error 500) {String} error 'Server error'.
 */
router.get('/comment/:commentId/replies', async (req, res) => {
    const commentId = req.params.commentId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    try {
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).send({ error: 'Comment not found' });
        }

        const replies = await Comment.find({ targetType: 'Comment', targetId: commentId })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).send(replies);
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});



// // Initialize Google OAuth2 client
// const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
// const client = new OAuth2Client(CLIENT_ID);

// // Define an async function to verify the Google token
// const verifyGoogleToken = async (idToken) => {
//   const ticket = await client.verifyIdToken({
//     idToken,
//     audience: CLIENT_ID,
//   });
//   return ticket.getPayload();
// };

module.exports = router;
