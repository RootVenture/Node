const mongoose = require('mongoose');
const slug = require('slugs');

mongoose.Promise = global.Promise; // use ES6 Promises
const storeSchema = new mongoose.Schema(
  {
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
    author: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: 'You must supply an author',
    },
  },
  // virtuals are hidden in json and objects in default;  this will show
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Define our indexes
storeSchema.index({
  name: 'text',
  description: 'text',
});

storeSchema.index({
  location: '2dsphere',
});

// Pre-save hook to create a slug
storeSchema.pre('save', async function (next) {
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
storeSchema.statics.getTagsList = function () {
  return this.aggregate([
    // split by tags
    { $unwind: '$tags' },
    // group by tags
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    // descending
    { $sort: { count: -1 } },
  ]);
};

storeSchema.statics.getTopStores = function () {
  return this.aggregate([
    // Lookup stores from the Review model and populate their review as 'reviews'
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'store',
        as: 'reviews',
      },
    },
    // filter for only items that have 2 or more reviews (reviews.1 is index 1 in an array)
    { $match: { 'reviews.1': { $exists: true } } },
    // add the average reviews field (project)
    {
      $project: {
        // $$ROOT is equal to the original document
        photo: '$$ROOT.photo',
        name: '$$ROOT.name',
        reviews: '$$ROOT.reviews',
        slug: '$$ROOT.slug',
        // $reviews means it is a field in the data piped in
        averageRating: { $avg: '$reviews.rating' },
      },
    },
    // sort it by our newfield, highest first
    { $sort: { averageRating: -1 } },
    // limit to 10 max
    { $limit: 10 },
  ]);
};

// create a virtual populate with Reviews model (mongoose-specific)
storeSchema.virtual('reviews', {
  ref: 'Review', // model to link
  localField: '_id', // field on the Store
  foreignField: 'store', // field on the Review
});

function autopopulate(next) {
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);
