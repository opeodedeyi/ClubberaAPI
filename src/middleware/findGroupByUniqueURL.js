const Group = require('../models/group');

async function findGroupByUniqueURL(req, res, next) {
    try {
        const group = await Group.findOne({ uniqueURL: req.params.groupUniqueURL });

        if (!group) {
            return res.status(404).send({ error: 'Group not found' });
        }

        req.group = group;
        next();
    } catch (e) {
        res.status(500).send();
    }
}

module.exports = {
    findGroupByUniqueURL,
};