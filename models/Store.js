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
  created: {
    type: Date,
    default: Date.now,
  },
  location: {
    type: {
      type: String,
      defeault: 'Point',
    },
    coordinates: [
      {
        type: Number,
        required: 'You must supply coordinates',
      },
    ],
    address: {
      type: String,
      required: 'You must supply an address!',
    },
  },
  photo: String,
});

// Pre-save hook to create a slug
storeSchema.pre('save', async function(next) {
  // need 'this' cannot be arrow
  if (!this.isModified('name')) {
    next(); // skip it
    return; // stop the function from running
  }
  this.slug = slug(this.name);
  // Make more resiliant so slugs are unique
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)`, 'i');
  // this.constructor is equal to 'Store'
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
  // increment up if slug exists
  if (storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }
  next();
});

// new method created with .statics
storeSchema.statics.getTagsList = function() {
  return this.aggregate([
    // split by tags
    { $unwind: '$tags' },
    // group by tags
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    // descending
    { $sort: { count: -1 } },
  ]);
};

module.exports = mongoose.model('Store', storeSchema);
