const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/login', userController.login);
router.post('/register', userController.register);
router.post('/logout', authMiddleware, userController.logout);

module.exports = router;
