const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');

// @route POST /api/blog/create
router.post('/create', authenticateToken, blogController.createPost);
// @route GET /api/blog/available
router.get('/available', authenticateToken, blogController.getAvailablePosts);
// @route POST /api/blog/complete
router.post('/complete', authenticateToken, blogController.completeRead);
// @route GET /api/blog/my-posts
router.get('/my-posts', authenticateToken, blogController.getUserPosts);

// Admin Management Routes
router.get('/admin/list', authenticateToken, adminController.getAdminBlogs);
router.patch('/admin/approve/:id', authenticateToken, adminController.approveBlog);
router.delete('/admin/delete/:id', authenticateToken, adminController.deleteBlog);

module.exports = router;