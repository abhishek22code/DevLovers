require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_URL || `http://${process.env.LOCALHOST_HOSTNAME || 'localhost'}:${process.env.SERVER_PORT || '3001'}`;

async function testVerifiedAPI() {
  try {
    const postsRes = await axios.get(`${BASE_URL}/api/posts?limit=5`);
    const posts = postsRes.data.posts || [];
    posts.forEach((post) => {
      const author = post.author || {};
      void author.isVerified;
    });

    const usersRes = await axios.get(`${BASE_URL}/api/users`);
    const users = usersRes.data.users || [];
    const testUser = users.find(u => u.username === 'abhisheksahani');
    if (testUser) {
      await axios.get(`${BASE_URL}/api/users/${testUser._id}`);
    }
  } catch (error) {
    // silent on error
  }
}

testVerifiedAPI();

