// User temporary hold


/**
 * @api {get} /find-users Search for a user by email or fullname (Tested)
 * @apiName SearchUser
 * @apiGroup User
 * @apiVersion 1.0.0
 *
 * @apiParam {String} query Search query for email or fullname.
 * @apiParam {Number} [page=1] Page number for paginated results.
 * @apiParam {Number} [limit=10] Number of results per page.
 *
 * @apiSuccess {Object[]} users List of users matching the search query.
 * @apiSuccess {Number} totalPages Total number of pages available.
 *
 * @apiError (Error 500) {String} error 'Server error'.
 */
// router.get('/find-users', async (req, res) => {
//     const query = req.query.query || '';
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;

//     const regex = new RegExp(query, 'i');

//     try {
//         const users = await User.find({
//             $or: [{ email: regex }, { fullname: regex }],
//         })
//             .skip((page - 1) * limit)
//             .limit(limit);

//         const count = await User.countDocuments({
//             $or: [{ email: regex }, { fullname: regex }],
//         });

//         const totalPages = Math.ceil(count / limit);

//         res.status(200).send({ users, totalPages });
//     } catch (e) {
//         res.status(500).send({ error: 'Server error' });
//     }
// });


/**
 * Update existing users URL
 * @route POST /update-all-url
 * @returns {Object} 201 - A success status and a success message
 * @returns {Object} 401 - An unauthorized status and an error message
 */
// router.post('/update-all-url', async (req, res) => {
//     // Use the userService to create a new user
//     try {
//         const users = await User.find({ uniqueURL: { $exists: false } });
//         users.forEach(async (user) => {
//             user.uniqueURL = user.fullname.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();
//             await user.save();
//         });
//         res.status(201).send({ users, message: 'User URL updated' });
//     } catch (e) {
//         res.status(401).send({ message: e.message });
//     }
// });


/**
 * Log out a user from all devices by removing all authentication tokens (Tested)
 * @route POST /logout-all
 * @middleware auth - The authentication middleware
 * @returns {Object} 200 - A success status and a success message
 * @returns {Object} 500 - An internal server error status and an error message
 */
// router.post('/logout-all', auth, async (req, res) => {
//     try {
//         req.user.tokens = []
//         await req.user.save()
//         res.status(200).send({ message: 'User logged out from all devices' });
//     } catch (e) {
//         res.status(500).send({ message: 'Something went wrong' });
//     }
// })


/**
 * Set a display picture for the user
 * @route POST /me/profile-photo
 * @middleware auth - The authentication middleware
 * @param {Object} req.body - The request body containing the image data
 * @returns {Object} 200 - A success status, the updated user object, and a success message
 * @returns {Object} 400 - A bad request status and an error message
 * @returns {Object} 500 - An internal server error status and an error message
 */
// router.post('/me/profile-photo', auth, express.json({ limit: '10mb' }), async (req, res) => {
//     try {
//         const user = req.user;
//         const imageData = req.body.imageData;
        
//         if (!imageData) {
//             return res.status(400).send({ message: 'No image data provided' });
//         }

//         const buffer = Buffer.from(imageData, 'base64');
//         const key = `profile-photos/${user._id}-${Date.now()}.jpg`;
        
//         try {
//             const data = await uploadToS3(buffer, key, 'image/jpeg');
//             const updatedUser = await userService.setProfilePhoto(user, data);
//             res.status(200).send({ updatedUser, message: 'Profile photo updated' });
//         } catch (err) {
//             res.status(500).send({ message: 'Something went wrong' });
//         }

//     } catch(e) {
//         res.status(500).send({ message: 'Something went wrong' });
//     }
// })