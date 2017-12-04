const mongoose = require('mongoose');

const Store = mongoose.model('Store'); // already imported via app.js

exports.homePage = (req, res) => {
  res.render('index');
};

exports.addStore = (req, res) => {
  res.render('editStore', {
    title: 'Add Store',
  });
};

exports.createStore = async (req, res) => {
  const store = await new Store(req.body).save();
  req.flash('success', `Successfully Created ${store.name}. Care to leave a review`);
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  // 1. Query the DB for a list of all stores
  const stores = await Store.find();
  res.render('stores', { title: 'Stores', stores });
};

exports.editStore = async (req, res) => {
  // 1. Find the store given the ID (in our params)
  const store = await Store.findOne({ _id: req.params.id });
  // 2. Confirm they are the owner of the store
  // TODO
  // 3. Render out the edit form to update the store
  res.render('editStore', {
    title: `Edit ${store.name}`,
    store,
  });
};

exports.updateStore = async (req, res) => {
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
