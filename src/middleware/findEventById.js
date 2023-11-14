const Event = require('../models/event');

async function findEventById(req, res, next) {
    try {
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).send({ error: 'Event not found.' });
        }

        req.event = event;
        next();
    } catch (e) {
        res.status(500).send({ error: 'Error processing request.' });
    }
}

module.exports = {
    findEventById,
};
