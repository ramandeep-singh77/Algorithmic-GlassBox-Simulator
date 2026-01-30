// Google Maps API loader utility
let isGoogleMapsLoaded = false;
let isGoogleMapsLoading = false;
let googleMapsPromise: Promise<void> | null = null;

export function loadGoogleMapsAPI(): Promise<void> {
  // If already loaded, return resolved promise
  if (isGoogleMapsLoaded) {
    return Promise.resolve();
  }

  // If currently loading, return the existing promise
  if (isGoogleMapsLoading && googleMapsPromise) {
    return googleMapsPromise;
  }

  // Get API key from environment variables
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API key not provided. Set VITE_GOOGLE_MAPS_API_KEY environment variable.'));
  }

  isGoogleMapsLoading = true;

  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if Google Maps is already loaded by another script
    if (window.google && window.google.maps) {
      isGoogleMapsLoaded = true;
      isGoogleMapsLoading = false;
      resolve();
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isGoogleMapsLoaded = true;
      isGoogleMapsLoading = false;
      resolve();
    };

    script.onerror = () => {
      isGoogleMapsLoading = false;
      reject(new Error('Failed to load Google Maps API'));
    };

    // Add script to document head
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export function isGoogleMapsAvailable(): boolean {
  return isGoogleMapsLoaded && !!(window.google && window.google.maps);
}

export function hasGoogleMapsAPIKey(): boolean {
  return !!(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
}