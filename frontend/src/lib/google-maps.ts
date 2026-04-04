let initPromise: Promise<{
  Map: typeof google.maps.Map;
  AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement | null;
}> | null = null;

function waitForGoogleMaps(timeoutMs = 10000): Promise<void> {
  if (typeof window !== "undefined" && window.google?.maps) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (window.google?.maps) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        reject(new Error("Google Maps script did not load within timeout"));
      }
    }, 100);
  });
}

export function initGoogleMaps() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Cannot load Google Maps on the server"));
  }

  if (initPromise) return initPromise;

  initPromise = (async () => {
    await waitForGoogleMaps();
    await google.maps.importLibrary("core");
    const { Map } = (await google.maps.importLibrary("maps")) as google.maps.MapsLibrary;

    let AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement | null = null;
    try {
      const markerLib = (await google.maps.importLibrary("marker")) as google.maps.MarkerLibrary;
      AdvancedMarkerElement = markerLib.AdvancedMarkerElement;
    } catch {
      console.warn("AdvancedMarkerElement not available, falling back to standard markers");
    }

    return { Map, AdvancedMarkerElement };
  })();

  return initPromise;
}
