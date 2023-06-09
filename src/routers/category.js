const express = require('express');
const { auth } = require('../middleware/auth');
const adminUser = require('../middleware/adminUser');
const Category = require('../models/category');

const router = new express.Router();


/**
 * Route for creating a new category.
 * The user must be authenticated and be an admin to create a new category.
 * 
 * @param {Object} req - Express request object, containing the category information in the request body.
 * @param {Object} res - Express response object.
 * @returns {Object} The created category or an error message if an error occurs.
 */
router.post('/category', auth, adminUser, async (req, res) => {
    try {
        const category = new Category({
            ...req.body,
            creator: req.user._id,
        });

        await category.save();
        res.status(201).send(category);
    } catch (e) {
        res.status(400).send(e);
    }
});


/**
 * Route for deleting a category.
 * The user must be authenticated and be an admin to delete a category.
 * 
 * @param {Object} req - Express request object, containing the category ID in the request parameters.
 * @param {Object} res - Express response object.
 * @returns {Object} The deleted category or an error message if an error occurs.
 */
router.delete('/category/:id', auth, adminUser, async (req, res) => {
    try {
        // Get the category ID from the request parameters
        const categoryId = req.params.id;
    
        // Find the category by its ID and remove it from the database
        const category = await Category.findByIdAndDelete(categoryId);
    
        // If the category is not found, send a 404 Not Found response
        if (!category) {
            return res.status(404).send({ error: 'Category not found' });
        }
  
        // Send a 200 OK response with the deleted category
        res.status(200).send(category);
    } catch (error) {
        // Send a 500 Internal Server Error response if an error occurs
        res.status(500).send({ error: 'Server error' });
    }
});


/**
 * Route for getting all categories.
 * This route does not require authentication.
 *
 * @route GET /categories
 * @returns {Array<Category>} 200 - An array of all categories in the database
 * @returns {Object} 500 - Server error with an error message
 */
router.get('/category', async (req, res) => {
    try {
        const categories = await Category.find({});
        res.status(200).send(categories);
    } catch (e) {
        res.status(500).send({ error: 'Server error' });
    }
});


module.exports = router;