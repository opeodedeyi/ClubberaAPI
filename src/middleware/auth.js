const jwt = require('jsonwebtoken');
const User = require('../models/user');
require('dotenv').config();


/**
 * Middleware function for authentication.
 * Verifies the token and checks if the user exists in the database.
 *
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @param {Function} next - The next middleware function in the stack.
 */
const auth = async (req, res, next) => {
    try {
        // Extract the token from the Authorization header
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const user = await User.findOne({ _id: decoded._id, 'tokens.token': token }).select('+password');

        if (!user) {
            throw new Error();
        }

        // Attach the token and user object to the request object
        req.token = token;
        req.user = user;
        next();
    } catch (e) {
        res.status(401).send({ error: 'Please authenticate' });
    }
};


module.exports = {
    auth,
};
