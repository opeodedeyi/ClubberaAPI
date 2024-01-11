const express = require('express');
const Group = require('../models/group');

const router = new express.Router();


/**
 * @api {get} /groups Get all groups
 * @apiName GetAllGroups
 * @apiGroup Group
 * @apiVersion 1.0.0
 *
 * @apiParam {String} [search] Search query for name, location, category, and description fields.
 * @apiParam {String} [category] Filter by category.
 * @apiParam {Number} [page=1] Page number for pagination.
 * @apiParam {Number} [limit=10] Number of groups per page.
 *
 * @apiSuccess {Object[]} groups List of groups.
 *
 * @apiError (Error 500) {String} error 'Server error'.
 */
router.get('/search', async (req, res) => {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;

    // If search query is empty, retrieve all groups
    let groups;
    try {
        if (search === '') {
            groups = await Group.find({})
                .skip((page - 1) * limit)
                .limit(limit);
        } else {
            // Build the MongoDB search query using $text search for name, location.address, description, and categories
            const query = {
                $text: { $search: search }
            };

            // Find the groups, including the search score, and sort by score
            groups = await Group.find(query, { score: { $meta: 'textScore' } })
                .sort({ score: { $meta: 'textScore' } })
                .skip((page - 1) * limit)
                .limit(limit);
        }

        res.status(200).send(groups);
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


module.exports = router;
