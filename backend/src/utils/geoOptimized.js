

const User = require('../models/User');
const { MAX_SEARCH_RADIUS_KM } = require('./geo');


const findNearestCollectorOptimized = async (latitude, longitude) => {
  if (!latitude || !longitude) return null;

  try {
    const result = await User.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          distanceField: 'distance_meters',
          maxDistance: MAX_SEARCH_RADIUS_KM * 1000, // Convert to meters
          spherical: true,
          query: {
            role: 'collector',
            is_active: true,
            'collector_profile.is_available': true,
            'collector_profile.location.coordinates': { $ne: [0, 0] }
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          phone: 1,
          avatar_url: 1,
          collector_profile: 1,
          distance_km: {
            $divide: ['$distance_meters', 1000]
          }
        }
      },
      {
        $limit: 1
      }
    ]);

    if (!result.length) return null;

    const collector = result[0];
    return {
      collector: {
        _id: collector._id,
        name: collector.name,
        phone: collector.phone,
        avatar_url: collector.avatar_url,
        collector_profile: collector.collector_profile
      },
      distance_km: Math.round(collector.distance_km * 100) / 100
    };
  } catch (err) {
    console.error('findNearestCollector error:', err);
    return null;
  }
};

module.exports = { findNearestCollectorOptimized };
