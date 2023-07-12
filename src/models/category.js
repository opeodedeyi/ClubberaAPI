const mongoose = require('mongoose');


/**
 * Category schema representing a group category.
 *
 * @typedef {Object} Category
 * @property {string} name - The name of the category.
 * @property {mongoose.Types.ObjectId} creator - The ID of the user who created the category.
 */
const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
});


// Create the category model using the category schema
const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
