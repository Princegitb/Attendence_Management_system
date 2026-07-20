/**
 * Server-side Haversine Distance Formula
 * Calculates the great-circle distance between two points on the Earth's surface in meters.
 * 
 * @param {number} lat1 Latitude of point 1 (in degrees)
 * @param {number} lon1 Longitude of point 1 (in degrees)
 * @param {number} lat2 Latitude of point 2 (in degrees)
 * @param {number} lon2 Longitude of point 2 (in degrees)
 * @returns {number} Distance in meters (rounded to 2 decimal places)
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const p1Lat = parseFloat(lat1);
  const p1Lon = parseFloat(lon1);
  const p2Lat = parseFloat(lat2);
  const p2Lon = parseFloat(lon2);

  if (isNaN(p1Lat) || isNaN(p1Lon) || isNaN(p2Lat) || isNaN(p2Lon)) {
    throw new Error('Invalid GPS coordinates provided for Haversine calculation');
  }

  const R = 6371000; // Earth's mean radius in meters
  const rad = Math.PI / 180;

  const dLat = (p2Lat - p1Lat) * rad;
  const dLon = (p2Lon - p1Lon) * rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1Lat * rad) * Math.cos(p2Lat * rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distanceInMeters = R * c;
  return Math.round(distanceInMeters * 100) / 100;
}

module.exports = { calculateHaversineDistance };
