const isEmailConfirmed = async (req, res, next) => {
    try {
        const user = req.user;

        if (!user.isEmailConfirmed) {
            throw new Error();
        }

        next();
    } catch (e) {
        res.status(403).send({ error: 'Your email must be verified to access this resource' });
    }
};
  
module.exports = isEmailConfirmed;