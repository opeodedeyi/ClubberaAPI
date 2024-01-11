// User temporary hold


/**
 * @api {get} /find-users Search for a user by email or fullname (Tested)
 * @apiName SearchUser
 * @apiGroup User
 * @apiVersion 1.0.0
 *
 * @apiParam {String} query Search query for email or fullname.
 * @apiParam {Number} [page=1] Page number for paginated results.
 * @apiParam {Number} [limit=10] Number of results per page.
 *
 * @apiSuccess {Object[]} users List of users matching the search query.
 * @apiSuccess {Number} totalPages Total number of pages available.
 *
 * @apiError (Error 500) {String} error 'Server error'.
 */
// router.get('/find-users', async (req, res) => {
//     const query = req.query.query || '';
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;

//     const regex = new RegExp(query, 'i');

//     try {
//         const users = await User.find({
//             $or: [{ email: regex }, { fullname: regex }],
//         })
//             .skip((page - 1) * limit)
//             .limit(limit);

//         const count = await User.countDocuments({
//             $or: [{ email: regex }, { fullname: regex }],
//         });

//         const totalPages = Math.ceil(count / limit);

//         res.status(200).send({ users, totalPages });
//     } catch (e) {
//         res.status(500).send({ error: 'Server error' });
//     }
// });



// Group temporary hold

/**
 * @route POST /group/:id/ban-user/:userId
 * @desc Ban a user from a group if the requester is the owner or a moderator. The owner and moderators cannot be banned.
 * @param {string} id - The ID of the group.
 * @param {string} userId - The ID of the user to be banned.
 * @access Private (Requires authentication and email confirmation)
 */
// router.post('/group/:id/ban-user/:userId', auth, isEmailConfirmed, async (req, res) => {
//     try {
//         const groupId = req.params.id;
//         const group = await Group.findById(groupId);

//         if (!group) {
//             return res.status(404).send({ error: 'Group not found' });
//         }

//         const currentUserId = req.user._id;
//         const isOwner = group.owner.equals(currentUserId);
//         const isModerator = group.moderators.some((moderatorId) => moderatorId.equals(currentUserId));

//         if (!isOwner && !isModerator) {
//             return res.status(403).send({ error: 'You do not have permission to ban users' });
//         }

//         const userIdToBan = req.params.userId;

//         if (group.owner.equals(userIdToBan) || group.moderators.some((moderatorId) => moderatorId.equals(userIdToBan))) {
//             return res.status(400).send({ error: 'You cannot ban the owner or a moderator of this group' });
//         }

//         const isBanned = group.bannedUsers.some((bannedUserId) => bannedUserId.equals(userIdToBan));

//         if (isBanned) {
//             return res.status(400).send({ error: 'User is already banned from this group' });
//         }

//         group.bannedUsers.push(userIdToBan);
//         group.members = group.members.filter((memberId) => !memberId.equals(userIdToBan));
//         group.requests = group.requests.filter((requestId) => !requestId.equals(userIdToBan));

//         await group.save();

//         res.status(200).send(group);
//     } catch (e) {
//         res.status(500).send({ error: 'Server error' });
//     }
// });


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
// router.post('/group/:id/unban-user/:userId', auth, isEmailConfirmed, async (req, res) => {
//     try {
//         const groupId = req.params.id;
//         const group = await Group.findById(groupId);

//         if (!group) {
//             return res.status(404).send({ error: 'Group not found' });
//         }

//         const currentUserId = req.user._id;
//         const isOwner = group.owner.equals(currentUserId);
//         const isModerator = group.moderators.some((moderatorId) => moderatorId.equals(currentUserId));

//         if (!isOwner && !isModerator) {
//             return res.status(403).send({ error: 'You do not have permission to unban users' });
//         }

//         const userIdToUnban = req.params.userId;
//         const isBanned = group.bannedUsers.some((bannedUserId) => bannedUserId.equals(userIdToUnban));

//         if (!isBanned) {
//             return res.status(400).send({ error: 'User is not banned from this group' });
//         }

//         group.bannedUsers = group.bannedUsers.filter((bannedUserId) => !bannedUserId.equals(userIdToUnban));

//         await group.save();

//         res.status(200).send(group);
//     } catch (e) {
//         res.status(500).send({ error: 'Server error' });
//     }
// });

