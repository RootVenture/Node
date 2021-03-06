const mongoose = require('mongoose');

const User = mongoose.model('User');
const Store = mongoose.model('Store'); // already imported via app.js
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  // - store file in memory b/c will resize prior to upload
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    // - mimetype will inform what type of photo it is
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: "That file type isn't allowed" }, false);
    }
  },
};

exports.homePage = (req, res) => {
  res.render('index');
};

exports.addStore = (req, res) => {
  res.render('editStore', {
    title: 'Add Store',
  });
};

// reads file into memory
exports.upload = multer(multerOptions).single('photo');

// resize photo
exports.resize = async (req, res, next) => {
  // check if there is no new file to resize
  if (!req.file) {
    next(); // skip to next middleware
    return;
  }
  const extension = req.file.mimetype.split('/')[1];
  // create unique name for file
  req.body.photo = `${uuid.v4()}.${extension}`;
  // resize photo
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO); // w: 800 h: auto
  await photo.write(`./public/uploads/${req.body.photo}`);
  // once we have written the photo to our filesystem, keep going!
  next();
};

exports.createStore = async (req, res) => {
  req.body.author = req.user._id;
  const store = await new Store(req.body).save();
  req.flash('success', `Successfully Created ${store.name}. Care to leave a review`);
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 4;
  const skip = page * limit - limit;

  // 1. Query the DB for a list of all stores
  const storesPromise = Store.find()
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' });
  const countPromise = Store.count();
  const [stores, count] = await Promise.all([storesPromise, countPromise]);

  // ceil - upper bound if uneven division
  const pages = Math.ceil(count / limit);

  if (!stores.length && skip) {
    req.flash('info', `Hey! You asked for page ${page}. But that doesn't exist. So I put you on page ${pages}`);
    res.redirect(`/stores/page/${pages}`);
  }
  res.render('stores', { title: 'Stores', stores, page, pages, count });
};

const confirmOwner = (store, user) => {
  // equals method needed to compare because it is an ObjectId
  if (!store.author.equals(user._id)) {
    throw Error('You must own the store in order to edit it!');
  }
};

exports.editStore = async (req, res) => {
  // 1. Find the store given the ID (in our params)
  const store = await Store.findOne({ _id: req.params.id });
  // 2. Confirm they are the owner of the store
  confirmOwner(store, req.user);
  // 3. Render out the edit form to update the store
  res.render('editStore', {
    title: `Edit ${store.name}`,
    store,
  });
};

exports.updateStore = async (req, res) => {
  // set the location data to be a point
  req.body.location.type = 'Point';
  // 1. Find and update the store given the ID (in our params)
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // return the new store intead of the old one
    runValidators: true, // Note the storeSchema
  }).exec();
  req.flash(
    'success',
    `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store</a>`
  );
  // 2. Redirect to store and flash success
  res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug }).populate('author reviews');
  if (!store) {
    return next();
  }
  res.render('store', { title: store.name, store });
};

exports.getStoreByTag = async (req, res) => {
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true };
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
  res.render('tag', { tags, stores, title: 'Tags', tag, tagQuery });
};

exports.searchStores = async (req, res) => {
  const stores = await Store.find(
    {
      $text: {
        $search: req.query.q,
      },
    },
    // provide metadata based on frequency of search
    {
      score: { $meta: 'textScore' },
    }
  )
    .sort({
      score: { $meta: 'textScore' },
    })
    // limit search to first 5 results
    .limit(5);
  res.json(stores);
};

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates,
        },
        $maxDistance: 10000, // 10 km
      },
    },
  };
  const stores = await Store.find(q)
    .select('slug name description location photo')
    .limit(10);
  res.json(stores);
};

exports.mapPage = (req, res) => {
  res.render('map', { title: 'Map' });
};

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());
  // pull: remove; addToSet: add unique
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  // [] required to compute property name
  const user = await User.findByIdAndUpdate(req.user._id, { [operator]: { hearts: req.params.id } }, { new: true });
  res.json(user);
};

exports.getHearts = async (req, res) => {
  // const stores = await User.find({ email: req.user.email }).populate('hearts');
  const stores = await Store.find({ _id: { $in: req.user.hearts } });
  // res.json(stores);
  res.render('stores', { title: 'Hearted Stores', stores });
};

exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores();
  res.render('topStores', { stores, title: '★ Top Stores!' });
};
