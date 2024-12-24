export interface GeoSearchResponse {
  type: string; // "FeatureCollection"
  features: Feature[];
  bbox?: [number, number, number, number]; // Optional bounding box
}

export interface Feature {
  type: string; // "Feature"
  geometry: {
    type: string; // "Point"
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    label: string; // Full address label
    housenumber?: string; // House number
    street?: string; // Street name
    distance?: number; // Distance from query point
    accuracy?: string; // Accuracy level
    point?: {
      lat: number; // Latitude of the query point
      lon: number; // Longitude of the query point
    };
    name?: string; // Name of the venue or address
    borough?: string; // Borough name
    neighborhood?: string; // Neighborhood name
    city?: string; // City name
    state?: string; // State name
    postalcode?: string; // Postal code
    country?: string; // Country name
    confidence?: number; // Confidence level
  };
}

export const fetchGeoData = async (lat:number|string,lon:number|string): Promise<GeoSearchResponse | null> => {
    const url = "https://geosearch.planninglabs.nyc/v2/reverse";
    const params = new URLSearchParams({
      "point.lat": lat.toString(),
      "point.lon": lon.toString(),
      size: "1",
    });
  
    try {
      const response = await fetch(`${url}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data: GeoSearchResponse = await response.json();
      return data; // Return the data object
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : error);
      return null; // Return null if there’s an error
    }
  };

  