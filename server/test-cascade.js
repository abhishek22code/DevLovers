const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');

// Connect to MongoDB
const mongoHost = process.env.MONGODB_HOST || process.env.LOCALHOST_HOSTNAME || 'localhost';
const mongoPort = process.env.MONGODB_PORT || '27017';
const mongoDB = process.env.MONGODB_DB || 'devlovers';
mongoose.connect(process.env.MONGODB_URI || `mongodb://${mongoHost}:${mongoPort}/${mongoDB}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testCascadeDeletion() {
  try {
    console.log('🧪 Testing Cascade Deletion...\n');

    // 1. Create a test user
    console.log('1. Creating test user...');
    const testUser = new User({
      username: 'testuser_cascade',
      email: 'testcascade@example.com',
      password: 'password123',
      gender: 'male'
    });
    await testUser.save();
    console.log(`✅ Created user: ${testUser.username} (ID: ${testUser._id})\n`);

    // 2. Create test posts for this user
    console.log('2. Creating test posts...');
    const testPosts = [];
    for (let i = 1; i <= 3; i++) {
      const post = new Post({
        author: testUser._id,
        content: `Test post ${i} for cascade deletion testing`,
        tags: ['test', 'cascade']
      });
      await post.save();
      testPosts.push(post);
      console.log(`✅ Created post: ${post._id}`);
    }
    console.log(`\n✅ Created ${testPosts.length} posts\n`);

    // 3. Verify posts exist
    console.log('3. Verifying posts exist...');
    const postCount = await Post.countDocuments({ author: testUser._id });
    console.log(`✅ Found ${postCount} posts for user\n`);

    // 4. Delete the user (this should trigger cascade deletion)
    console.log('4. Deleting user (should trigger cascade deletion)...');
    await User.findByIdAndDelete(testUser._id);
    console.log('✅ User deleted\n');

    // 5. Verify posts were also deleted
    console.log('5. Verifying posts were cascade deleted...');
    const remainingPosts = await Post.countDocuments({ author: testUser._id });
    console.log(`✅ Remaining posts for deleted user: ${remainingPosts}\n`);

    if (remainingPosts === 0) {
      console.log('🎉 SUCCESS: Cascade deletion is working perfectly!');
    } else {
      console.log('❌ FAILED: Cascade deletion did not work properly');
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
testCascadeDeletion();


















