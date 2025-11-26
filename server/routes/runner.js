const express = require('express');
const router = express.Router();
const { compileAndRun } = require('../controllers/runnerController');

// Public endpoint; rate-limited globally by /api limiter
router.post('/compile-run', compileAndRun);

module.exports = router;


