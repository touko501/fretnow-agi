/**
 * 📍 GPS TRACKING SERVICE — Real-time Vehicle & Mission Tracking
 *
 * Features:
 * - Record GPS positions from Traccar protocol
 * - Retrieve mission tracks and vehicle positions
 * - Calculate ETA based on current position and route
 * - Geofence detection for pickup/delivery points
 * - Mission progress calculation
 * - Position history export
 *
 * Integration Points:
 * - GpsPosition Prisma model for position storage
 * - Mission model for tracking active missions
 * - Vehicle & Driver models for ownership
 * - Routing service for ETA calculation
 *
 * Last updated: 15/03/2026
 */

const { haversineDistance, calculateBearing } = require('./routing');

/**
 * Default geofence radius (meters)
 * Used for arrival detection at pickup/delivery points
 */
const DEFAULT_GEOFENCE_RADIUS = 100;

/**
 * Minimum speed threshold (km/h) to consider vehicle as moving
 */
const MIN_MOVING_SPEED = 5;

class GPSTrackingService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Record a GPS position from vehicle/driver
   * Typically called by Traccar integration endpoint
   *
   * @param {Object} options
   * - {string} missionId - Active mission ID (optional)
   * - {string} vehicleId - Vehicle ID
   * - {string} driverId - Driver ID
   * - {number} lat - Latitude
   * - {number} lon - Longitude
   * - {number} speed - Speed in km/h (optional)
   * - {number} heading - Heading in degrees 0-360 (optional)
   * - {number} accuracy - Position accuracy in meters (optional)
   * @returns {Object} { positionId, geofenceAlert? }
   */
  async recordPosition({
    missionId,
    vehicleId,
    driverId,
    lat,
    lon,
    speed,
    heading,
    accuracy,
  }) {
    try {
      // Validate coordinates
      if (!lat || !lon || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        throw new Error('Invalid coordinates');
      }

      // Create position record
      const position = await this.prisma.gpsPosition.create({
        data: {
          missionId,
          vehicleId,
          driverId,
          lat,
          lon,
          speed: speed ? Math.max(0, parseFloat(speed)) : null,
          heading: heading ? Math.max(0, Math.min(360, parseFloat(heading))) : null,
          accuracy: accuracy ? Math.max(0, parseFloat(accuracy)) : null,
          recordedAt: new Date(),
        },
      });

      // Check geofence if mission active
      let geofenceAlert = null;
      if (missionId) {
        geofenceAlert = await this.checkGeofence(missionId, lat, lon);
      }

      return {
        positionId: position.id,
        recorded: true,
        geofenceAlert,
      };
    } catch (error) {
      console.error('Position recording error:', error);
      throw new Error(`Failed to record position: ${error.message}`);
    }
  }

  /**
   * Get all positions for a mission (complete track)
   * @param {string} missionId
   * @param {number} limit - Max results (default: 1000)
   * @returns {Array} Array of positions in chronological order
   */
  async getMissionTrack(missionId, limit = 1000) {
    try {
      const positions = await this.prisma.gpsPosition.findMany({
        where: { missionId },
        orderBy: { recordedAt: 'asc' },
        take: limit,
        select: {
          id: true,
          lat: true,
          lon: true,
          speed: true,
          heading: true,
          accuracy: true,
          recordedAt: true,
        },
      });

      return positions;
    } catch (error) {
      console.error('Mission track retrieval error:', error);
      throw new Error(`Failed to retrieve mission track: ${error.message}`);
    }
  }

  /**
   * Get the latest position for a vehicle
   * @param {string} vehicleId
   * @returns {Object|null} Latest position or null if no positions
   */
  async getVehicleLastPosition(vehicleId) {
    try {
      const position = await this.prisma.gpsPosition.findFirst({
        where: { vehicleId },
        orderBy: { recordedAt: 'desc' },
        select: {
          id: true,
          missionId: true,
          lat: true,
          lon: true,
          speed: true,
          heading: true,
          accuracy: true,
          recordedAt: true,
        },
      });

      return position || null;
    } catch (error) {
      console.error('Last position retrieval error:', error);
      throw new Error(`Failed to retrieve vehicle last position: ${error.message}`);
    }
  }

  /**
   * Get live positions for multiple missions (for real-time dashboard)
   * @param {Array<string>} missionIds - Array of mission IDs
   * @returns {Object} { missionId: { position, vehicle, driver, mission } }
   */
  async getLivePositions(missionIds) {
    try {
      if (!Array.isArray(missionIds) || missionIds.length === 0) {
        return {};
      }

      const positions = await this.prisma.gpsPosition.findMany({
        where: { missionId: { in: missionIds } },
        distinct: ['missionId'],
        orderBy: { recordedAt: 'desc' },
        select: {
          id: true,
          missionId: true,
          vehicleId: true,
          driverId: true,
          lat: true,
          lon: true,
          speed: true,
          heading: true,
          recordedAt: true,
          vehicle: {
            select: {
              id: true,
              registration: true,
              type: true,
              make: true,
              model: true,
            },
          },
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          mission: {
            select: {
              id: true,
              reference: true,
              status: true,
              pickupLat: true,
              pickupLon: true,
              deliveryLat: true,
              deliveryLon: true,
              progressPercent: true,
            },
          },
        },
      });

      // Index by mission ID
      const result = {};
      for (const pos of positions) {
        result[pos.missionId] = {
          position: {
            id: pos.id,
            lat: pos.lat,
            lon: pos.lon,
            speed: pos.speed,
            heading: pos.heading,
            recordedAt: pos.recordedAt,
          },
          vehicle: pos.vehicle,
          driver: pos.driver,
          mission: pos.mission,
        };
      }

      return result;
    } catch (error) {
      console.error('Live positions retrieval error:', error);
      throw new Error(`Failed to retrieve live positions: ${error.message}`);
    }
  }

  /**
   * Calculate ETA to destination based on current position
   * Uses straight-line distance with average speed estimate
   *
   * @param {string} missionId
   * @param {number} avgSpeedKmh - Average speed (default: 70)
   * @returns {Object} { eta, distanceKm, estimatedMinutes }
   */
  async calculateETA(missionId, avgSpeedKmh = 70) {
    try {
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
        select: {
          deliveryLat: true,
          deliveryLon: true,
        },
      });

      if (!mission || !mission.deliveryLat || !mission.deliveryLon) {
        throw new Error('Mission not found or missing delivery coordinates');
      }

      // Get last position
      const lastPos = await this.prisma.gpsPosition.findFirst({
        where: { missionId },
        orderBy: { recordedAt: 'desc' },
        select: { lat: true, lon: true, speed: true },
      });

      if (!lastPos) {
        throw new Error('No positions recorded for this mission');
      }

      // Calculate distance using haversine formula
      const distanceKm = haversineDistance(
        lastPos.lat,
        lastPos.lon,
        mission.deliveryLat,
        mission.deliveryLon
      ) / 1000;

      // Use current speed if available and vehicle is moving
      const speedToUse = (lastPos.speed && lastPos.speed >= MIN_MOVING_SPEED)
        ? lastPos.speed
        : avgSpeedKmh;

      const estimatedMinutes = Math.round((distanceKm / speedToUse) * 60);
      const eta = new Date(Date.now() + estimatedMinutes * 60 * 1000);

      return {
        eta,
        distanceKm: Math.round(distanceKm * 10) / 10, // 1 decimal
        estimatedMinutes,
        speedUsed: speedToUse,
      };
    } catch (error) {
      console.error('ETA calculation error:', error);
      throw new Error(`Failed to calculate ETA: ${error.message}`);
    }
  }

  /**
   * Check if current position is within geofence of pickup/delivery points
   * Triggers arrival detection
   *
   * @param {string} missionId
   * @param {number} lat - Current latitude
   * @param {number} lon - Current longitude
   * @param {number} radiusMeters - Geofence radius (default: 100m)
   * @returns {Object|null} { type: 'pickup'|'delivery', alert: true } or null
   */
  async checkGeofence(missionId, lat, lon, radiusMeters = DEFAULT_GEOFENCE_RADIUS) {
    try {
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
        select: {
          status: true,
          pickupLat: true,
          pickupLon: true,
          pickupConfirmedAt: true,
          deliveryLat: true,
          deliveryLon: true,
          deliveryConfirmedAt: true,
        },
      });

      if (!mission) return null;

      // Check pickup geofence
      if (
        mission.pickupLat &&
        mission.pickupLon &&
        !mission.pickupConfirmedAt &&
        mission.status === 'IN_TRANSIT'
      ) {
        const pickupDistance = haversineDistance(lat, lon, mission.pickupLat, mission.pickupLon);
        if (pickupDistance <= radiusMeters) {
          return {
            type: 'pickup',
            alert: true,
            distanceMeters: Math.round(pickupDistance),
          };
        }
      }

      // Check delivery geofence
      if (
        mission.deliveryLat &&
        mission.deliveryLon &&
        !mission.deliveryConfirmedAt &&
        (mission.status === 'IN_TRANSIT' || mission.status === 'PICKED_UP')
      ) {
        const deliveryDistance = haversineDistance(lat, lon, mission.deliveryLat, mission.deliveryLon);
        if (deliveryDistance <= radiusMeters) {
          return {
            type: 'delivery',
            alert: true,
            distanceMeters: Math.round(deliveryDistance),
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Geofence check error:', error);
      return null; // Don't throw, just log
    }
  }

  /**
   * Calculate mission progress percentage based on distance traveled
   * @param {string} missionId
   * @returns {Object} { progressPercent, distanceTraveledKm, totalDistanceKm }
   */
  async updateMissionProgress(missionId) {
    try {
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
        select: {
          pickupLat: true,
          pickupLon: true,
          deliveryLat: true,
          deliveryLon: true,
          distanceKm: true,
        },
      });

      if (!mission || !mission.pickupLat || !mission.deliveryLat) {
        throw new Error('Mission not found or missing coordinates');
      }

      // Get last position
      const lastPos = await this.prisma.gpsPosition.findFirst({
        where: { missionId },
        orderBy: { recordedAt: 'desc' },
        select: { lat: true, lon: true },
      });

      if (!lastPos) {
        throw new Error('No positions recorded for this mission');
      }

      // Calculate distances
      const distanceStartToCurrent = haversineDistance(
        mission.pickupLat,
        mission.pickupLon,
        lastPos.lat,
        lastPos.lon
      );

      const distanceStartToEnd = haversineDistance(
        mission.pickupLat,
        mission.pickupLon,
        mission.deliveryLat,
        mission.deliveryLon
      );

      const progressPercent = Math.min(
        100,
        Math.round((distanceStartToCurrent / distanceStartToEnd) * 100)
      );

      // Update mission
      await this.prisma.mission.update({
        where: { id: missionId },
        data: { progressPercent },
      });

      return {
        progressPercent,
        distanceTraveledKm: Math.round((distanceStartToCurrent / 1000) * 10) / 10,
        totalDistanceKm: mission.distanceKm || Math.round((distanceStartToEnd / 1000) * 10) / 10,
      };
    } catch (error) {
      console.error('Progress update error:', error);
      throw new Error(`Failed to update mission progress: ${error.message}`);
    }
  }

  /**
   * Get position history for a vehicle within a date range
   * @param {string} vehicleId
   * @param {Date} fromDate
   * @param {Date} toDate
   * @param {number} limit - Max results (default: 5000)
   * @returns {Array} Array of positions
   */
  async getPositionHistory(vehicleId, fromDate, toDate, limit = 5000) {
    try {
      const positions = await this.prisma.gpsPosition.findMany({
        where: {
          vehicleId,
          recordedAt: {
            gte: new Date(fromDate),
            lte: new Date(toDate),
          },
        },
        orderBy: { recordedAt: 'asc' },
        take: limit,
        select: {
          id: true,
          missionId: true,
          lat: true,
          lon: true,
          speed: true,
          heading: true,
          accuracy: true,
          recordedAt: true,
        },
      });

      return positions;
    } catch (error) {
      console.error('Position history retrieval error:', error);
      throw new Error(`Failed to retrieve position history: ${error.message}`);
    }
  }

  /**
   * Get GPS statistics for a mission
   * @param {string} missionId
   * @returns {Object} { positionCount, duration, maxSpeed, avgSpeed, totalDistance }
   */
  async getMissionGPSStats(missionId) {
    try {
      const positions = await this.prisma.gpsPosition.findMany({
        where: { missionId },
        orderBy: { recordedAt: 'asc' },
        select: { lat: true, lon: true, speed: true, recordedAt: true },
      });

      if (positions.length === 0) {
        return {
          positionCount: 0,
          duration: 0,
          maxSpeed: 0,
          avgSpeed: 0,
          totalDistance: 0,
        };
      }

      // Calculate duration
      const firstPos = positions[0];
      const lastPos = positions[positions.length - 1];
      const durationMinutes = Math.round(
        (lastPos.recordedAt - firstPos.recordedAt) / (1000 * 60)
      );

      // Find max and avg speed
      const speeds = positions.filter((p) => p.speed).map((p) => p.speed);
      const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
      const avgSpeed = speeds.length > 0
        ? Math.round((speeds.reduce((a, b) => a + b, 0) / speeds.length) * 10) / 10
        : 0;

      // Calculate total distance traveled
      let totalDistance = 0;
      for (let i = 1; i < positions.length; i++) {
        const dist = haversineDistance(
          positions[i - 1].lat,
          positions[i - 1].lon,
          positions[i].lat,
          positions[i].lon
        );
        totalDistance += dist;
      }

      return {
        positionCount: positions.length,
        durationMinutes,
        maxSpeed: Math.round(maxSpeed * 10) / 10,
        avgSpeed,
        totalDistanceKm: Math.round((totalDistance / 1000) * 10) / 10,
      };
    } catch (error) {
      console.error('GPS stats calculation error:', error);
      throw new Error(`Failed to calculate GPS stats: ${error.message}`);
    }
  }
}

module.exports = GPSTrackingService;
