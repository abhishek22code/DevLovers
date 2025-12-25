const express = require('express');
const auth = require('../middleware/auth');
const usersController = require('../controllers/usersController');

const router = express.Router();

router.get('/test', (req, res) => {
  res.json({ message: 'Users router is working', path: req.path, timestamp: new Date().toISOString() });
});

router.get('/search/skills', usersController.searchUsersBySkills);
router.get('/', usersController.getUsers);
router.get('/:id', usersController.getUserById);
router.get('/:id/posts', usersController.getUserPosts);
router.post('/:id/follow', auth, usersController.toggleFollow);
router.get('/:id/followers', usersController.getUserFollowers);
router.get('/:id/following', usersController.getUserFollowing);
router.delete('/:id', auth, usersController.deleteUser);

module.exports = router;






