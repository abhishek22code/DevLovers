// Test script to verify API returns isVerified
require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_URL || `http://${process.env.LOCALHOST_HOSTNAME || 'localhost'}:${process.env.SERVER_PORT || '3001'}`;

async function testVerifiedAPI() {
  try {
    console.log('Testing API endpoints for isVerified field...\n');
    
    // Test 1: Get posts
    console.log('1. Testing GET /api/posts');
    const postsRes = await axios.get(`${BASE_URL}/api/posts?limit=5`);
    const posts = postsRes.data.posts || [];
    console.log(`   Found ${posts.length} posts`);
    posts.forEach((post, idx) => {
      const author = post.author || {};
      console.log(`   Post ${idx + 1}: Author "${author.username}" - isVerified: ${author.isVerified} (type: ${typeof author.isVerified})`);
    });
    
    // Test 2: Get user by ID (abhisheksahani)
    console.log('\n2. Testing GET /api/users/:id');
    const usersRes = await axios.get(`${BASE_URL}/api/users`);
    const users = usersRes.data.users || [];
    const testUser = users.find(u => u.username === 'abhisheksahani');
    
    if (testUser) {
      const userRes = await axios.get(`${BASE_URL}/api/users/${testUser._id}`);
      const user = userRes.data;
      console.log(`   User "${user.username}" - isVerified: ${user.isVerified} (type: ${typeof user.isVerified})`);
    } else {
      console.log('   User "abhisheksahani" not found in users list');
    }
    
    console.log('\n✅ API test completed');
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

testVerifiedAPI();

