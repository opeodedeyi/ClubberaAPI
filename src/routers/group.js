const express = require('express');
const { auth } = require('../middleware/auth');
const isEmailConfirmed = require('../middleware/isEmailConfirmed');
const ActivityLog = require('../models/activityLog');
const Group = require('../models/group');
const User = require('../models/user');
const { uploadToS3 } = require('../services/s3Service');
const { formatTimeDiff } = require('../utils/timeUtils');
const router = new express.Router();


// ToDo
// - Add pagination, sort by datejoined, gender, birthday, fullName of memberlist
// - Add pagination, sort by datejoined, gender, birthday, fullName of requestslist
// - Delete image from s3 if any when uploading a new image
// - get next meeting- show, location, date, and time


router.post('/creategroup', auth, async (req, res) => {
    try {
        let bannerData = null;

        if (req.body.base64data && req.body.fileName) {
            const uploadedImageData = await uploadToS3(req.body.base64data, req.body.fileName)
            bannerData = {
                provider: "aws",
                key: uploadedImageData.key,
                location: uploadedImageData.location,
            }
        }
        const groupData = {
            ...req.body,
            owner: req.user._id,
        };

        if (bannerData) {
            groupData.banner = bannerData;
        }
        const group = new Group(groupData);
        await group.save();
        res.status(201).send(group);
    } catch (e) {
        res.status(400).send(e);
    }
});


router.patch('/group/:id/edit', auth, async (req, res) => {
    try {
        const groupId = req.params.id;
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        if (!isUserAuthorized(req.user, group)) {
            return res.status(403).json({ error: 'Not authorized to edit this group' });
        }

        const updatedGroup = await updateGroup(group, req.body);
        await logActivity(groupId, req.user._id, 'edited_group');
        res.status(200).json(updatedGroup);
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});


router.patch('/group/:id/changebanner', auth, async (req, res) => {
    try {
        const groupId = req.params.id;
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }
        if (!isUserAuthorized(req.user, group)) {
            return res.status(403).json({ error: 'Not authorized to edit this group' });
        }

        const uploadedImageData = await uploadToS3(req.body.base64data, req.body.fileName)
        group.banner = {
            provider: "aws",
            key: uploadedImageData.key,
            location: uploadedImageData.location,
        }
        await group.save();
        await logActivity(groupId, req.user._id, 'edited_group');
        res.status(200).json(updatedGroup);
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});


router.get('/groups/:uniqueURL', async (req, res) => {
    try {
        const group = await Group.findOne({ uniqueURL: req.params.uniqueURL })
                                .select('-members -requests -bannedUsers')
                                .lean();
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        group.memberCount = group.members ? group.members.length : 0;
        let buttonAction = 'Join group';

        if (req.user) {
            const userId = req.user._id;
            const isMember = group.members.includes(userId);
            const isRequested = group.requests.includes(userId);
            const isBanned = group.bannedUsers.includes(userId);

            if (isBanned) {
                buttonAction = 'Banned';
            } else if (isMember) {
                buttonAction = 'Leave group';
            } else if (isRequested) {
                buttonAction = 'Requested';
            }
        }

        group.buttonAction = buttonAction;
        res.status(200).send(group);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


router.get('/groups/:uniqueURL/members', async (req, res) => {
    try {
        const group = await Group.findOne({ uniqueURL: req.params.uniqueURL }).lean();
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const memberArr = group.members;
        const joinDateMap = await fetchJoinLogs(memberArr, group._id);
        const members = await fetchMembers(memberArr);
        const formattedMembers = formatMembers(members, joinDateMap);
        res.status(200).json({ members: formattedMembers });
    } catch (err) {
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});


router.get('/groups/:uniqueURL/requests', async (req, res) => {
    try {
        const uniqueURL = req.params.uniqueURL;
        
        const group = await Group.findOne({ uniqueURL }).select('requests').lean();
        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }

        // Get request details and ActivityLog in parallel for efficiency
        const [requestDetails, activityLogs] = await Promise.all([
            Group.populate(group, { 
                path: 'requests', 
                select: '-isActive -isEmailConfirmed -bio' // Exclude certain fields
            }),
            ActivityLog.find({
                groupId: group._id,
                action: 'request_sent'
            }).lean()
        ]);

        // Adding requestSent property
        const currentTime = new Date();
        const requestsWithTime = requestDetails.requests.map(request => {
            const log = activityLogs.find(log => log.userId.equals(request._id));
            const timeDiff = currentTime - log.timestamp;
            const requestSent = formatTimeDiff(timeDiff);
            return { ...request.toObject(), requestSent };
        });

        res.status(200).send(requestsWithTime);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});


router.post('/group/:uniqueURL/join', auth, async (req, res) => {
    try {
        const uniqueURL = req.params.uniqueURL;
        const group = await Group.findOne({ uniqueURL }).lean();
        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }
        const userId = req.user._id;
        let buttonAction = 'Leave group';
        let actionType = 'joined';

        if (isUserMember(req.user, group)) {
            return res.status(400).send({ error: 'You are already a member of this group' });
        }
        if (isUserRequested(req.user, group)) {
            return res.status(400).send({ error: 'You already have a pending request to join this group' });
        }

        if (group.permissionRequired) {
            group.requests.push(userId);
            buttonAction = 'Requested';
            actionType = 'request_sent';
        } else {
            group.members.push(userId);
        }
        await group.save();
        group.buttonAction = buttonAction;
        group.memberCount = group.members ? group.members.length : 0;
        await logActivity(group._id, req.user._id, actionType);
        res.status(200).send(group);
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


router.post('/group/:uniqueURL/leave', auth, async (req, res) => {
    try {
        const uniqueURL = req.params.uniqueURL;
        const group = await Group.findOne({ uniqueURL }).lean();
        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }
        const userId = req.user._id;
        let buttonAction = 'Join group';
        let actionType = 'left';

        if (!isUserMember(req.user, group) && !isUserRequested(req.user, group)) {
            return res.status(400).send({ error: 'You are not a member or do not have a pending request to join this group' });
        }

        if (isUserMember(req.user, group)) {
            group.members = group.members.filter((memberId) => !memberId.equals(userId));
        } else if (isUserRequested(req.user, group)) {
            group.requests = group.requests.filter((requestId) => !requestId.equals(userId));
            actionType = 'retracted_request';
        }
        await group.save();
        group.buttonAction = buttonAction;
        group.memberCount = group.members ? group.members.length : 0;
        await logActivity(group._id, req.user._id, actionType);
        res.status(200).send(group);
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


router.post('/group/:uniqueURL/accept-request/:userId', auth, isEmailConfirmed, async (req, res) => {
    try {
        const uniqueURL = req.params.uniqueURL;
        const group = await Group.findOne({ uniqueURL }).lean();
        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }
        if (!isUserAuthorized(req.user, group)) {
            return res.status(403).send({ error: 'You do not have permission to accept requests' });
        }

        const userIdToAccept = req.params.userId;
        const hasRequest = group.requests.some((requestId) => requestId.equals(userIdToAccept));
        if (!hasRequest) {
            return res.status(400).send({ error: 'User does not have a pending request to join this group' });
        }

        group.requests = group.requests.filter((requestId) => !requestId.equals(userIdToAccept));
        group.members.push(userIdToAccept);
        await group.save();
        await logActivity(group._id, userIdToAccept, 'request_approved');
        await logActivity(group._id, userIdToAccept, 'joined');
        res.status(200).send(group);
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


router.post('/group/:uniqueURL/reject-request/:userId', auth, isEmailConfirmed, async (req, res) => {
    try {
        const uniqueURL = req.params.uniqueURL;
        const group = await Group.findOne({ uniqueURL }).lean();
        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }
        if (!isUserAuthorized(req.user, group)) {
            return res.status(403).send({ error: 'You do not have permission to accept requests' });
        }

        const userIdToReject = req.params.userId;
        const hasRequest = group.requests.some((requestId) => requestId.equals(userIdToReject));
        if (!hasRequest) {
            return res.status(400).send({ error: 'User does not have a pending request to join this group' });
        }

        group.requests = group.requests.filter((requestId) => !requestId.equals(userIdToReject));
        await group.save();
        await logActivity(group._id, userIdToReject, 'request_denied');
        res.status(200).send(group);
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


// Reusable functions
async function isUserAuthorized(user, group) {
    return group.owner.equals(user._id);
}

async function isUserMember(user, group) {
    return group.members.includes(user._id);
}

async function isUserRequested(user, group) {
    return group.requests.includes(user._id);
}

async function fetchMembers(memberIds) {
    return await User.find({
        _id: { $in: memberIds }
    }).select('-isActive -isEmailConfirmed').lean();
}

function formatMembers(members, joinDateMap) {
    // format each member to add date and time
    return members.map(member => {
        const joinDate = joinDateMap[member._id];
        if (joinDate) {
            const date = new Date(joinDate);
            member.dateJoined = `${date.getDate()} ${date.toLocaleString('en', { month: 'short' })} ${date.getFullYear()}`;
            member.timeJoined = date.toLocaleTimeString();
        }
        return member;
    });
}

async function fetchJoinLogs(memberIds, groupId) {
    const joinLogs = await ActivityLog.find({
        userId: { $in: memberIds },
        action: 'joined',
        groupId: groupId
    }).lean();

    return joinLogs.reduce((acc, log) => {
        acc[log.userId] = log.timestamp;
        return acc;
    }, {});
}

async function updateGroup(group, updates) {
    const allowedUpdates = ['title', 'tagline', 'description', 'location', 'topics', 'isPrivate'];
    const isValidOperation = Object.keys(updates).every((key) => allowedUpdates.includes(key));

    if (!isValidOperation) {
        throw new Error('Invalid updates');
    }

    Object.keys(updates).forEach((key) => group[key] = updates[key]);
    await group.save();
    return group;
}

async function logActivity(groupId, userId, action) {
    const newLog = new ActivityLog({ groupId, userId, action });
    await newLog.save();
}

module.exports = router;
