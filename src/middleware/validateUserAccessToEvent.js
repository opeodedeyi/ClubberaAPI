const Group = require('../models/group'); // Import the Group model

async function validateUserAccessToEvent(req, res, next) {
    try {
        // Get the group from the event
        const group = await Group.findById(req.event.group).populate('owner').populate('moderators');

        // If there's no group, deny access
        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }

        // If the user is not the owner or a moderator, deny access
        if (!group.owner._id.equals(req.user._id) && !group.moderators.some(moderator => moderator._id.equals(req.user._id))) {
            return res.status(403).send({ error: 'User does not have sufficient privileges to modify this event' });
        }

        // If the user has sufficient access, move to the next middleware
        next();
    } catch (e) {
        res.status(500).send({ error: 'Failed to validate user access to the event' });
    }
};

module.exports = {
    validateUserAccessToEvent,
};
