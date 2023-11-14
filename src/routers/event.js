const express = require('express');
const { auth } = require('../middleware/auth');
const { findGroupByUniqueURL } = require('../middleware/findGroupByUniqueURL');
const { findEventById } = require('../middleware/findEventById');
const { validateUserAccessToGroup } = require('../middleware/validateUserAccessToGroup');
const { validateUserAccessToEvent } = require('../middleware/validateUserAccessToEvent');
const isEmailConfirmed = require('../middleware/isEmailConfirmed');
const Event = require('../models/event');
const Group = require('../models/group');

const { uploadToS3, deleteFromS3 } = require('../services/s3Service');

const router = new express.Router();


// Endpoint for creating a new event
router.post('/events/:groupUniqueURL', auth, findGroupByUniqueURL, validateUserAccessToGroup, async (req, res) => {
    try {
        const uploadedImageData = await uploadToS3(req.body.base64data, req.body.fileName)

        // Create a new event using the request body
        const event = new Event({
            ...req.body,
            creator: req.user._id,
            group: req.group._id,
            banner: {
                key: uploadedImageData.key,
                location: uploadedImageData.location,
            }
        });
        // Save the event to the database
        await event.save();

        res.status(201).send(event);
    } catch (e) {
        res.status(400).send(e);
    }
});

// Endpoint for updating an event
router.patch('/events/:id', auth, findEventById, validateUserAccessToEvent, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'description', 'eventDate', 'startTime', 'endTime', 'slots'];
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates!' });
    }

    try {
        updates.forEach((update) => req.event[update] = req.body[update]);
        await req.event.save();
        res.send(req.event);
    } catch (e) {
        res.status(400).send(e);
    }
});


// Update event Banner
router.patch('/events/:id/banner', auth, findEventById, validateUserAccessToEvent, async (req, res) => {
    try {
        if (req.event.banner.key) {
            await deleteFromS3(req.body.base64data, req.body.fileName)
        }
        const uploadedImageData = await uploadToS3(req.body.base64data, req.body.fileName)
        req.event.banner.key = uploadedImageData.key
        req.event.banner.location = uploadedImageData.location
        await req.event.save();
        res.send(req.event);
    } catch (e) {
        res.status(400).send(e);
    }
});

module.exports = router;

