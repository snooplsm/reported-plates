import { VehicleLicenseInfo, VehicleLicenseInfoResponse } from "./plate";

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

enum VehicleType {
  private, black, yellow, green, nypd, usps, commercial
}

// export const fetchPlate = async (license:string, state:string): Promise<any> => {
//   let vehicle_type = VehicleType.private;
//   let license_state = '';
//   let vehicle_year = null, vehicle_make = null, vehicle_model = null, vehicle_body = null;

//   if (!license || /^(MISSING|NOPLATE|BLURRY|NONE|XXX+|BLUR|NA|000)$/.test(license)) {
//     console.log("NO PLATE");
//     return { vehicle_type, license, license_state, vehicle_year, vehicle_make, vehicle_model, vehicle_body };
//   }

//   if (/^[TNWY]\d{6}C$/.test(license)) {
//     return { vehicle_type: 'black', license_state: 'NY' };
//   }

//   if (/^(\d[A-Z]\d{2})[A-Z]$/.test(license)) {
//     const medallion = license.match(/^(\d[A-Z]\d{2})[A-Z]$/)![1];
//     return { vehicle_type: 'yellow', license_state: 'NY', medallion };
//   }

//   if (/^\d[A-Z]\d{2}$/.test(license)) {
//     const url = `https://data.cityofnewyork.us/resource/rhe8-mgbb.json?license_number=${license}&$ORDER=last_updated_date%20DESC`;
//     try {
//       const response = await fetch(url);
//       const data = await response.json();
//       if (data.length > 0) {
//         license = data[0].dmv_license_plate_number;
//       } else {
//         console.log(`NO RESULTS: dmvlicense lookup from data.cityofnewyork.us: ${url}`);
//       }
//     } catch (error) {
//       console.log(`Error fetching medallion data: ${error}`);
//     }
//     return { vehicle_type: 'yellow', license_state: 'NY', license };
//   }

//   if (/^[A-Z]{2}\d{3}$/.test(license)) {
//     return { vehicle_type: 'green', license_state: 'NY' };
//   }

//   if (/^\d{4}$/.test(license) && (!state || state === 'NYPD')) {
//     return { vehicle_type: 'NYPD', license_state: 'NY' };
//   }

//   if (/^\d{7}$/.test(license)) {
//     return { vehicle_type: 'USPS', license_state: 'NY' };
//   }

//   if (/^\d{4}M[A-Z]$/.test(license)) {
//     return { vehicle_type: 'commercial', license_state: 'NY' };
//   }

//   return { vehicle_type, license_state };
//   }
// }

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

  