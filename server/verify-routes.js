// Quick verification script to check if routes are properly configured
const express = require('express');
const app = express();

console.log('🔍 Verifying messages routes configuration...\n');

// Test loading routes
try {
  const messagesRoutes = require('./routes/messages');
  console.log('✅ Messages routes module loaded');
  
  // Check if router has routes
  if (messagesRoutes && messagesRoutes.stack) {
    console.log(`✅ Router has ${messagesRoutes.stack.length} routes:\n`);
    messagesRoutes.stack.forEach((layer, index) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        console.log(`   ${index + 1}. ${methods} /api/messages${layer.route.path}`);
      } else if (layer.name === 'router') {
        console.log(`   ${index + 1}. [Nested Router]`);
      }
    });
  } else {
    console.log('⚠️  Router stack not found');
  }
  
  // Test controller
  const controller = require('./controllers/messagesController');
  console.log('\n✅ Messages controller loaded');
  console.log('   Exports:', Object.keys(controller).join(', '));
  
  console.log('\n✅ All checks passed! Routes should work after server restart.');
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}

