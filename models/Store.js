const mongoose = require('mongoose');
const slug = require('slugs');

mongoose.Promise = global.Promise; // use ES6 Promises
const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a store name!', // behaves as true
  },
  slug: String,
  description: {
    type: String,
    trim: true,
  },
  tags: [String],
});

// Pre-save hook to create a slug
storeSchema.pre('save', function(next) {
  // need 'this' cannot be arrow
  if (!this.isModified('name')) {
    next(); // skip it
    return; // stop the function from running
  }
  this.slug = slug(this.name);
  next();
  // TODO make more resiliant so slugs are unique
});

module.exports = mongoose.model('Store', storeSchema);
