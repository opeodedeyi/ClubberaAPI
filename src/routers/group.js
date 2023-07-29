const express = require('express');
const { auth } = require('../middleware/auth');
const isEmailConfirmed = require('../middleware/isEmailConfirmed');
const Group = require('../models/group');
const User = require('../models/user');

const { uploadToS3 } = require('../services/s3Service');

const router = new express.Router();


/**
 * @route POST /group
 * @desc Create a new social club (group)
 * @access Private (Authenticated and email confirmed users only)
 * 
 * This route allows a verified user (authenticated and with a confirmed email address) 
 * to create a new social club. The authenticated user's ID is set as the owner of the club.
 */
router.post('/group', auth, async (req, res) => {
    try {
        const uploadedImageData = await uploadToS3(req.body.base64data, req.body.fileName)

        // Create a new group with the provided data and set the owner to the authenticated user
        const group = new Group({
            ...req.body,
            owner: req.user._id,
            banner: {
                key: uploadedImageData.key,
                location: uploadedImageData.location,
            },
        });

        // Save the group to the database
        await group.save();

        // Send a 201 Created response with the created group
        res.status(201).send(group);
        // res.status(201).send(uploadedImageData);
    } catch (e) {
        // Send a 400 Bad Request response if an error occurs
        res.status(400).send(e);
    }
});


/**
 * Update existing groups URL
 * @route POST /update-all-groups-url
 * @returns {Object} 201 - A success status and a success message
 * @returns {Object} 401 - An unauthorized status and an error message
 */
router.post('/update-all-groups-url', async (req, res) => {
    try {
        const groups = await Group.find({ uniqueURL: { $exists: false } });

        for (const group of groups) {
            if (group.name) {
                group.uniqueURL = group.name.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();
                await group.save();
            }
        }

        res.status(201).send({ groups, message: 'Groups URL updated' });
    } catch (e) {
        res.status(401).send({ message: e.message });
    }
});


/**
 * @route PATCH /group/:id/edit
 * @desc Edit a group's details
 * @access Private (Owner or Moderator)
 *
 * @param {string} req.params.id - The ID of the group to be updated
 *
 */
router.get('/group/:id', async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        
        res.status(200).send(group);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
});


/**
 * @route GET /group/:uniqueURL
 * @desc Get a group by its uniqueURL
 * @access Public
 *
 * @param {string} req.params.uniqueURL - The uniqueURL of the group to be retrieved
 */
router.get('/groups/:uniqueURL', async (req, res) => {
    try {
        const group = await Group.findOne({ uniqueURL: req.params.uniqueURL });
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        res.status(200).send(group);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


/**
 * @route PATCH /group/:id/edit
 * @desc Edit a group's details
 * @access Private (Owner or Moderator)
 *
 * @param {Object} req.body - The request body containing the updates
 * @param {string} req.params.id - The ID of the group to be updated
 *
 * The user must be authenticated, have a confirmed email, and be the owner or a moderator of the group.
 */
router.patch('/group/:id/edit', auth, isEmailConfirmed, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'description', 'rules', 'bannerURL', 'location', 'category'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates' });
    }

    try {
        const groupId = req.params.id;
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }

        const currentUserId = req.user._id;
        const isOwner = group.owner.equals(currentUserId);
        const isModerator = group.moderators.some((moderatorId) => moderatorId.equals(currentUserId));

        if (!isOwner && !isModerator) {
            return res.status(403).send({ error: 'You do not have permission to edit this group' });
        }

        updates.forEach((update) => group[update] = req.body[update]);

        await group.save();

        res.status(200).send(group);
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


/**
 * @route DELETE /group/:id
 * @desc Delete a group if there are no members
 * @access Private (Owner only)
 *
 * @param {string} req.params.id - The ID of the group to be deleted
 *
 * The user must be authenticated, have a confirmed email, and be the owner of the group.
 */
router.delete('/group/:id', auth, isEmailConfirmed, async (req, res) => {
    try {
        const groupId = req.params.id;
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }

        const currentUserId = req.user._id;
        const isOwner = group.owner.equals(currentUserId);

        if (!isOwner) {
            return res.status(403).send({ error: 'You do not have permission to delete this group' });
        }

        if (group.members.length > 0) {
            return res.status(400).send({ error: 'Cannot delete a group with members' });
        }

        await group.remove();

        res.status(200).send({ message: 'Group deleted successfully' });
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


/**
 * Route to join a group.
 * The user must be authenticated and have a confirmed email address to join a group.
 *
 * @route POST /group/:id/join
 * @param {string} id - The ID of the group to join.
 * @requires {function} auth - The authentication middleware.
 * @requires {function} isEmailConfirmed - The middleware to check if the user's email is confirmed.
 */
router.post('/group/:id/join', auth, isEmailConfirmed, async (req, res) => {
    try {
        // Get the group ID from the request parameters and find the group
        const groupId = req.params.id;
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }

        const userId = req.user._id;

        // Check if the user is already a member or has a pending request
        const isMember = group.members.some((memberId) => memberId.equals(userId));
        const hasRequest = group.requests.some((requestId) => requestId.equals(userId));

        if (isMember) {
            return res.status(400).send({ error: 'You are already a member of this group' });
        }

        if (hasRequest) {
            return res.status(400).send({ error: 'You already have a pending request to join this group' });
        }

        if (group.permissionRequired) {
            // Add the user to the requests list
            group.requests.push(userId);
        } else {
            // Add the user to the members list
            group.members.push(userId);
        }

        // Save the updated group
        await group.save();

        res.status(200).send(group);
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


/**
 * Route for accepting a user's request to join a group.
 * The authenticated user must be the owner or a moderator of the group.
 *
 * @param {string} id - The ID of the group.
 * @param {string} userId - The ID of the user whose request is being accepted.
 */
router.post('/group/:id/accept-request/:userId', auth, isEmailConfirmed, async (req, res) => {
    try {
        const groupId = req.params.id;
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }

        const currentUserId = req.user._id;
        const isOwner = group.owner.equals(currentUserId);
        const isModerator = group.moderators.some((moderatorId) => moderatorId.equals(currentUserId));

        if (!isOwner && !isModerator) {
            return res.status(403).send({ error: 'You do not have permission to accept requests' });
        }

        const userIdToAccept = req.params.userId;
        const hasRequest = group.requests.some((requestId) => requestId.equals(userIdToAccept));

        if (!hasRequest) {
            return res.status(400).send({ error: 'User does not have a pending request to join this group' });
        }

        // Remove the user from the requests list and add them to the members list
        group.requests = group.requests.filter((requestId) => !requestId.equals(userIdToAccept));
        group.members.push(userIdToAccept);

        // Save the updated group
        await group.save();

        // Send a 200 OK response with the updated group
        res.status(200).send(group);
    } catch (e) {
        // Send a 500 Internal Server Error response if an error occurs
        res.status(500).send({ error: 'Server error' });
    }
});


/**
 * @api {post} /group/:id/reject-request/:userId Reject a user's request to join a group
 * @apiName RejectRequest
 * @apiGroup Group
 * @apiPermission owner, moderator
 *
 * @apiHeader {String} Authorization Bearer token containing the user's access token.
 *
 * @apiParam (URL Params) {String} id The ID of the group.
 * @apiParam (URL Params) {String} userId The ID of the user whose request should be rejected.
 *
 * @apiSuccess (200) {Object} group The updated group with the user's request rejected.
 *
 * @apiError (400) {Object} error An error message if the user does not have a pending request.
 * @apiError (403) {Object} error An error message if the authenticated user is not the owner or a moderator.
 * @apiError (404) {Object} error An error message if the group is not found.
 * @apiError (500) {Object} error An error message if a server error occurs.
 */
router.post('/group/:id/reject-request/:userId', auth, isEmailConfirmed, async (req, res) => {
    try {
        const groupId = req.params.id;
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }

        const currentUserId = req.user._id;
        const isOwner = group.owner.equals(currentUserId);
        const isModerator = group.moderators.some((moderatorId) => moderatorId.equals(currentUserId));

        if (!isOwner && !isModerator) {
            return res.status(403).send({ error: 'You do not have permission to reject requests' });
        }

        const userIdToReject = req.params.userId;
        const hasRequest = group.requests.some((requestId) => requestId.equals(userIdToReject));

        if (!hasRequest) {
            return res.status(400).send({ error: 'User does not have a pending request to join this group' });
        }

        group.requests = group.requests.filter((requestId) => !requestId.equals(userIdToReject));

        await group.save();

        res.status(200).send(group);
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


/**
 * @route POST /group/:id/leave-or-remove-request
 * @desc Leave a group or remove a pending request to join a group
 * @access Private (Authenticated user)
 *
 * @param {string} req.params.id - The ID of the group to leave or remove request
 *
 * The user must be authenticated and have a confirmed email.
 */
router.post('/group/:id/leave-or-remove-request', auth, isEmailConfirmed, async (req, res) => {
    try {
        const groupId = req.params.id;
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }

        const userId = req.user._id;

        const isMember = group.members.some((memberId) => memberId.equals(userId));
        const hasRequest = group.requests.some((requestId) => requestId.equals(userId));

        if (!isMember && !hasRequest) {
            return res.status(400).send({ error: 'You are not a member or do not have a pending request to join this group' });
        }

        if (isMember) {
            // Remove the user from the members list
            group.members = group.members.filter((memberId) => !memberId.equals(userId));

            // Check if the user is a moderator and remove them from the moderators list if necessary
            const isModerator = group.moderators.some((moderatorId) => moderatorId.equals(userId));
            if (isModerator) {
                group.moderators = group.moderators.filter((moderatorId) => !moderatorId.equals(userId));
            }
        } else if (hasRequest) {
            // Remove the user from the requests list
            group.requests = group.requests.filter((requestId) => !requestId.equals(userId));
        }

        await group.save();

        res.status(200).send(group);
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


/**
 * @route POST /group/:id/add-moderator/:userId
 * @param {string} id - The ID of the group.
 * @param {string} userId - The ID of the user to be added as a moderator.
 * @description Allows the owner of a group to add a user as a moderator. The user must be a member of the group
 * to receive a moderator invitation. Sends a moderator invitation to the user.
 * @access Private (authenticated and email confirmed)
 * @returns {Object} An object containing the message 'Moderator invitation sent' and the user with the updated moderatorInvitations.
 * @throws {Error} 404 - 'Group not found' if the group is not found.
 * @throws {Error} 403 - 'You do not have permission to add a moderator' if the requester is not the owner of the group.
 * @throws {Error} 404 - 'User not found' if the user to be added as a moderator is not found.
 * @throws {Error} 400 - 'User must be a member of the group to become a moderator' if the user is not a member of the group.
 * @throws {Error} 400 - 'User already has a pending moderator invitation for this group' if the user already has a moderator invitation for the group.
 * @throws {Error} 500 - 'Server error' for any server-related issues.
 */
router.post('/group/:id/add-moderator/:userId', auth, isEmailConfirmed, async (req, res) => {
    try {
        const groupId = req.params.id;
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }

        const currentUserId = req.user._id;
        const isOwner = group.owner.equals(currentUserId);

        if (!isOwner) {
            return res.status(403).send({ error: 'You do not have permission to add a moderator' });
        }

        const userIdToAdd = req.params.userId;
        const userToAdd = await User.findById(userIdToAdd);

        if (!userToAdd) {
            return res.status(404).send({ error: 'User not found' });
        }

        const hasModeratorInvitation = userToAdd.moderatorInvitations.some((invitation) => invitation.group.equals(groupId));

        if (hasModeratorInvitation) {
            return res.status(400).send({ error: 'User already has a pending moderator invitation for this group' });
        }

        userToAdd.moderatorInvitations.push({ group: groupId });

        await userToAdd.save();

        res.status(200).send({ message: 'Moderator invitation sent', user: userToAdd });
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


/**
 * @route POST /group/:id/remove-moderator/:userId
 * @description Remove a user as a moderator of a group. Only the owner of the group can perform this action.
 * @access Private, owner only
 * @param {string} req.params.id - The ObjectId of the group.
 * @param {string} req.params.userId - The ObjectId of the user to be removed as a moderator.
 * @returns {Object} The updated group object with the user removed as a moderator.
 * @throws {Error} 404 - Group not found
 * @throws {Error} 403 - You do not have permission to remove a moderator
 * @throws {Error} 400 - User is not a moderator of this group
 * @throws {Error} 500 - Server error
 */
router.post('/group/:id/remove-moderator/:userId', auth, isEmailConfirmed, async (req, res) => {
    try {
        const groupId = req.params.id;
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }

        const currentUserId = req.user._id;
        const isOwner = group.owner.equals(currentUserId);

        if (!isOwner) {
            return res.status(403).send({ error: 'You do not have permission to remove a moderator' });
        }

        const userIdToRemove = req.params.userId;
        const isModerator = group.moderators.some((moderatorId) => moderatorId.equals(userIdToRemove));

        if (!isModerator) {
            return res.status(400).send({ error: 'User is not a moderator of this group' });
        }

        group.moderators = group.moderators.filter((moderatorId) => !moderatorId.equals(userIdToRemove));
        await group.save();

        res.status(200).send(group);
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


/**
 * @route POST /group/:id/ban-user/:userId
 * @desc Ban a user from a group if the requester is the owner or a moderator. The owner and moderators cannot be banned.
 * @param {string} id - The ID of the group.
 * @param {string} userId - The ID of the user to be banned.
 * @access Private (Requires authentication and email confirmation)
 */
router.post('/group/:id/ban-user/:userId', auth, isEmailConfirmed, async (req, res) => {
    try {
        const groupId = req.params.id;
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }

        const currentUserId = req.user._id;
        const isOwner = group.owner.equals(currentUserId);
        const isModerator = group.moderators.some((moderatorId) => moderatorId.equals(currentUserId));

        if (!isOwner && !isModerator) {
            return res.status(403).send({ error: 'You do not have permission to ban users' });
        }

        const userIdToBan = req.params.userId;

        if (group.owner.equals(userIdToBan) || group.moderators.some((moderatorId) => moderatorId.equals(userIdToBan))) {
            return res.status(400).send({ error: 'You cannot ban the owner or a moderator of this group' });
        }

        const isBanned = group.bannedUsers.some((bannedUserId) => bannedUserId.equals(userIdToBan));

        if (isBanned) {
            return res.status(400).send({ error: 'User is already banned from this group' });
        }

        group.bannedUsers.push(userIdToBan);
        group.members = group.members.filter((memberId) => !memberId.equals(userIdToBan));
        group.requests = group.requests.filter((requestId) => !requestId.equals(userIdToBan));

        await group.save();

        res.status(200).send(group);
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


/**
 * @api {post} /group/:id/unban-user/:userId Unban a user from a group
 * @apiName UnbanUser
 * @apiGroup Group
 * @apiPermission owner, moderator
 *
 * @apiHeader {String} Authorization Bearer token containing the user's access token.
 *
 * @apiParam (URL Params) {String} id The ID of the group.
 * @apiParam (URL Params) {String} userId The ID of the user to unban.
 *
 * @apiSuccess (200) {Object} group The updated group with the user unbanned.
 *
 * @apiError (400) {Object} error An error message if the user is not banned from the group.
 * @apiError (403) {Object} error An error message if the authenticated user is not the owner or a moderator.
 * @apiError (404) {Object} error An error message if the group is not found.
 * @apiError (500) {Object} error An error message if a server error occurs.
 */
router.post('/group/:id/unban-user/:userId', auth, isEmailConfirmed, async (req, res) => {
    try {
        const groupId = req.params.id;
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }

        const currentUserId = req.user._id;
        const isOwner = group.owner.equals(currentUserId);
        const isModerator = group.moderators.some((moderatorId) => moderatorId.equals(currentUserId));

        if (!isOwner && !isModerator) {
            return res.status(403).send({ error: 'You do not have permission to unban users' });
        }

        const userIdToUnban = req.params.userId;
        const isBanned = group.bannedUsers.some((bannedUserId) => bannedUserId.equals(userIdToUnban));

        if (!isBanned) {
            return res.status(400).send({ error: 'User is not banned from this group' });
        }

        group.bannedUsers = group.bannedUsers.filter((bannedUserId) => !bannedUserId.equals(userIdToUnban));

        await group.save();

        res.status(200).send(group);
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


/**
 * @api {post} /group/:id/accept-moderator-invitation Accept a moderator invitation
 * @apiName AcceptModeratorInvitation
 * @apiGroup Group
 * @apiPermission user
 *
 * @apiHeader {String} Authorization Bearer token containing the user's access token.
 *
 * @apiParam (URL Params) {String} id The ID of the group.
 *
 * @apiSuccess (200) {Object} group The updated group with the user as a moderator.
 *
 * @apiError (400) {Object} error An error message if the user does not have a moderator invitation.
 * @apiError (404) {Object} error An error message if the group is not found.
 * @apiError (500) {Object} error An error message if a server error occurs.
 */
router.post('/group/:id/accept-moderator-invitation', auth, isEmailConfirmed, async (req, res) => {
    try {
        const groupId = req.params.id;
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }

        const userId = req.user._id;
        const invitationIndex = req.user.moderatorInvitations.findIndex((invitation) => invitation.group.equals(groupId));

        if (invitationIndex === -1) {
            return res.status(400).send({ error: 'You do not have an invitation to become a moderator for this group' });
        }

        req.user.moderatorInvitations.splice(invitationIndex, 1);
        group.moderators.push(userId);

        await group.save();
        await req.user.save();

        res.status(200).send(group);
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


/**
 * @route POST /group/:id/reject-moderator-invitation
 * @desc Allows a user to reject a moderator invitation for a group
 * @access Private
 *
 * @param {string} id - The ID of the group
 *
 * @returns {object} - A success message indicating the moderator invitation was rejected
 * @throws {Error} - If the group is not found or the user doesn't have a moderator invitation for the group
 */
router.post('/group/:id/reject-moderator-invitation', auth, isEmailConfirmed, async (req, res) => {
    try {
        const groupId = req.params.id;
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }

        const userId = req.user._id;
        const invitationIndex = req.user.moderatorInvitations.findIndex((invitation) => invitation.group.equals(groupId));

        if (invitationIndex === -1) {
            return res.status(400).send({ error: 'You do not have an invitation to become a moderator for this group' });
        }

        req.user.moderatorInvitations.splice(invitationIndex, 1);

        await req.user.save();

        res.status(200).send({ message: 'Moderator invitation rejected' });
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


module.exports = router;
