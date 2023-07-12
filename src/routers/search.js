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
    const category = req.query.category || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const lng = parseFloat(req.query.lng);
    const lat = parseFloat(req.query.lat);
    const distance = parseFloat(req.query.distance) || 10; // Distance in miles

    // Build the MongoDB search query using $text search for name, location.address, description and categories
    const query = {
        $text: { $search: search }
    };

    // Add category filter to the query if provided
    if (category) {
        query.categories = category;
    }

    // Add location filter to the query if latitude and longitude are provided
    if (lng && lat) {
        const earthRadiusInMiles = 3963.2;
        query['location.geo.coordinates'] = {
            $geoWithin: {
                $centerSphere: [[lng, lat], distance / earthRadiusInMiles],
            },
        };
    }

    try {
        const groups = await Group.find(query)
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).send(groups);
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


module.exports = router;
