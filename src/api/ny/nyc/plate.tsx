// Define the interface for the HTTP response
export interface VehicleLicenseInfo {
    active: string; // "YES" or "NO"
    vehicle_license_number: string; // License number
    name: string; // Full name in "LAST,FIRST,MIDDLE" format
    license_type: string; // Type of license, e.g., "FOR HIRE VEHICLE"
    expiration_date: string; // Expiration date in ISO format
    dmv_license_plate_number: string; // License plate number
    vehicle_vin_number: string; // VIN number of the vehicle
    vehicle_year: string; // Year of the vehicle
    base_number: string; // Base number of the vehicle
    base_name: string; // Name of the base, e.g., "UBER USA, LLC"
    base_type: string; // Type of base, e.g., "BLACK-CAR"
    base_telephone_number: string; // Base telephone number
    base_address: string; // Full address of the base
    reason: string; // Reason for any status, e.g., "G"
    last_date_updated: string; // Last updated date in ISO format
    last_time_updated: string; // Last updated time
  }
  
  // Define the HTTP response type
  export type VehicleLicenseInfoResponse = VehicleLicenseInfo[];