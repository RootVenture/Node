const express = require('express');

const router = express.Router();
const storeController = require('../controllers/storeController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { catchErrors } = require('../handlers/errorHandlers');

router.get('/', catchErrors(storeController.getStores));
router.get('/stores', catchErrors(storeController.getStores));

// validate user is logged in before allowing them to log in
router.get('/add', authController.isLoggedIn, storeController.addStore);
router.post(
  '/add',
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.createStore)
);
router.post(
  '/add/:id',
  storeController.upload,
  catchErrors(storeController.resize),
  catchErrors(storeController.updateStore)
);

router.get('/stores/:id/edit', catchErrors(storeController.editStore));
router.get('/store/:slug', catchErrors(storeController.getStoreBySlug));

router.get('/tags', catchErrors(storeController.getStoreByTag));
router.get('/tags/:tag', catchErrors(storeController.getStoreByTag));

router.get('/login', userController.loginForm);
router.post('/login', authController.login);

router.get('/register', userController.registerForm);

router.post(
  '/register',
  // 1. Validate the registration data
  userController.validateRegister,
  // 2. Register the User
  userController.register,
  // 3. Login the User
  authController.login
);

router.get('/account', authController.isLoggedIn, userController.account);
router.post('/account', catchErrors(userController.updateAccount));
router.post('/account/forgot', catchErrors(authController.forgot));
router.get('/account/reset/:token', catchErrors(authController.reset));
router.post('/account/reset/:token', authController.confirmedPasswords, catchErrors(authController.update));
router.get('/logout', authController.logout);

module.exports = router;
