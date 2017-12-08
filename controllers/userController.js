const mongoose = require('mongoose');

const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.loginForm = (req, res) => {
  res.render('login', { title: 'Login' });
};

exports.registerForm = (req, res) => {
  res.render('register', { title: 'Register' });
};

exports.validateRegister = (req, res, next) => {
  // santizeBody part of expressValidator package (app.js)
  req.sanitizeBody('name');
  req.checkBody('name', 'You must supply a name!').notEmpty();
  req.checkBody('email', 'That email is not valid!').isEmail();

  req.sanitizeBody('email').normalizeEmail({
    remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false,
  });
  req.checkBody('password', 'Password Canot be Blank!').notEmpty();
  req.checkBody('password-confirm', 'Confirmed Password cannot be empty!').notEmpty();
  req.checkBody('password-confirm', 'Oop! Your passwords do not match').equals(req.body.password);
  const errors = req.validationErrors();
  if (errors) {
    req.flash('error', errors.map(err => err.msg));
    res.render('register', { title: 'Register', body: req.body, flashes: req.flash() });
    return; // stop fn from running
  }
  next(); // no issues!
};

exports.register = async (req, res, next) => {
  const user = new User({ email: req.body.email, name: req.body.name });
  // .register from passportLocalMongoose
  // pass promisify method you wish to turn into promise & Object to bind to
  const register = promisify(User.register, User);
  // register will create & store hash
  await register(user, req.body.password);
  next(); // pass to authController.login
};
