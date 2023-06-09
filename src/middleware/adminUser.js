const adminUser = async (req, res, next) => {
    try {
        const user = req.user;

        if (!user.isAdmin) {
            throw new Error();
        }

        next();
    } catch (e) {
        res.status(403).send({ error: 'You do not have the required permissions' });
    }
};

module.exports = adminUser;
