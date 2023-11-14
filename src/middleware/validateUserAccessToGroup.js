function validateUserAccessToGroup(req, res, next) {
    // check if the authenticated user is the group owner or a moderator
    if (req.user._id !== req.group.owner && !req.group.moderators.includes(req.user._id)) {
        return res.status(403).send({ error: 'User does not have sufficient permissions' });
    }

    next();
}

module.exports = {
    validateUserAccessToGroup,
};
