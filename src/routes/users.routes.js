const express = require('express');

const usersController = require('../controllers/users.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/me', requireAuth, usersController.getMe);

module.exports = router;
