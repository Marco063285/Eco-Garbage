const mongoose = require('mongoose');
const User = require('./src/models/User');
const { findNearestCollector } = require('./src/controllers/requestController');

async function testOptimizedCollectorAssignment() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/eco-garbage', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Test coordinates (somewhere in a city)
    const testLat = 48.8566; // Paris latitude
    const testLng = 2.3522;  // Paris longitude

    console.log(`🔍 Testing collector assignment for coordinates: ${testLat}, ${testLng}`);

    // Measure performance
    const startTime = Date.now();
    const result = await findNearestCollector(testLat, testLng);
    const endTime = Date.now();

    const executionTime = endTime - startTime;

    console.log(`⏱️  Execution time: ${executionTime}ms`);

    if (result) {
      console.log('✅ Found nearest collector:');
      console.log(`   Name: ${result.collector.name}`);
      console.log(`   Distance: ${result.distance_km} km`);
      console.log(`   Available: ${result.collector.collector_profile.is_available}`);
    } else {
      console.log('❌ No available collector found within search radius');
    }

    // Performance check
    if (executionTime < 100) {
      console.log('🚀 Performance: EXCELLENT (< 100ms)');
    } else if (executionTime < 500) {
      console.log('✅ Performance: GOOD (< 500ms)');
    } else {
      console.log('⚠️  Performance: SLOW (> 500ms) - may need further optimization');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testOptimizedCollectorAssignment();