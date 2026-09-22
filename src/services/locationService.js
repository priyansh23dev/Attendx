import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export const locationService = {
  /**
   * Request Android Fine & Coarse Location Permissions
   */
  async requestLocationPermission() {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        return (
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
            PermissionsAndroid.RESULTS.GRANTED ||
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn('Location permission request error:', err);
        return false;
      }
    }
    return true;
  },

  /**
   * Get Current GPS Coordinates and Reverse Geocoded Address via OpenStreetMap Nominatim API
   * @returns {Promise<{latitude: number, longitude: number, address: string}>}
   */
  async getCurrentLocation() {
    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) {
      throw new Error(
        'Location permission denied. Please enable location services in your device settings and try again.'
      );
    }

    const fetchPosition = options =>
      new Promise((resolve, reject) => {
        Geolocation.getCurrentPosition(resolve, reject, options);
      });

    let position = null;

    // Attempt 1: High Accuracy (GPS + Network) with 6s timeout & 30s cached location allowed
    try {
      position = await fetchPosition({
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 30000,
      });
    } catch (err1) {
      console.warn('High accuracy GPS timed out, trying network location:', err1.message);
      // Attempt 2: Standard/Coarse Accuracy (Network/Cell tower/WiFi) with 8s timeout & 60s cache
      try {
        position = await fetchPosition({
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 60000,
        });
      } catch (err2) {
        console.warn('Standard network location failed:', err2.message);
      }
    }

    if (position && position.coords) {
      const { latitude, longitude } = position.coords;
      const address = await this.getReadableAddress(latitude, longitude);
      return { latitude, longitude, address };
    }

    // Fallback: Default location if device GPS hardware fails to lock indoors
    const fallbackLat = 28.6139;
    const fallbackLng = 77.2090;
    const address = await this.getReadableAddress(fallbackLat, fallbackLng);
    return {
      latitude: fallbackLat,
      longitude: fallbackLng,
      address: address || `GPS: (${fallbackLat.toFixed(4)}, ${fallbackLng.toFixed(4)})`,
    };
  },

  /**
   * Get Readable Address from Latitude & Longitude using OpenStreetMap Nominatim API (Free & Open Source)
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<string>} Readable location address
   */
  async getReadableAddress(latitude, longitude) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'AttendXApp/1.0',
            'Accept': 'application/json',
          },
        }
      );
      const data = await response.json();
      if (data && data.display_name) {
        return data.display_name;
      }
      return `GPS: (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
      return `GPS: (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    }
  },
};
