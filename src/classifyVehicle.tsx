type VehicleInfo = {
  vehicleType: string;
  license: string;
  licenseState: string | null;
  medallion?: string | null;
};

export async function classifyVehicle(license: string, state?: string): Promise<VehicleInfo> {
  // Strip any non-alphanumeric characters and upcase the license
  license = license.replace(/\W+/g, "").toUpperCase();
  let medallion: string | null = null;

  // Determine vehicle type based on the license pattern
  let vehicleType: string;
  let licenseState: string | null = state || null;

  switch (true) {
    case /^(MISSING|NOPLATE|BLURRY|NONE|XXX+|BLUR|NA|000)$/i.test(license):
      vehicleType = "private";
      license = "";
      licenseState = null;
      medallion = null;
      break;

    case /^[TNWY]\d{6}C$/.test(license):
      vehicleType = "black";
      licenseState = "NY";
      break;

    case /^(\d[A-Z]\d{2})[A-Z]$/.test(license): {
      const match = license.match(/^(\d[A-Z]\d{2})[A-Z]$/);
      medallion = match ? match[1] : null;
      vehicleType = "yellow";
      licenseState = "NY";
      break;
    }

    case /^\d[A-Z]\d{2}$/.test(license):
      medallion = license;
      vehicleType = "yellow";
      licenseState = "NY";
      const controller = new AbortController();
      const signal = controller.signal;
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const yellowUrl = `https://data.cityofnewyork.us/resource/rhe8-mgbb.json?license_number=${license}&$ORDER=last_updated_date%20DESC`;
      try {
        const yellowResponse = await fetch(yellowUrl, { signal });
        if (!yellowResponse.ok) throw new Error(`Error fetching yellow cab data: ${yellowResponse.status}`);
        const yellowData = await yellowResponse.json();
        license = yellowData[0]?.dmv_license_plate_number || license;
      } catch (error) {
        console.error(`NO RESULTS: dmv license lookup from data.cityofnewyork.us: ${yellowUrl}`);
      } finally {
        clearTimeout(timeoutId)
      }
      break;

    case /^[A-Z]{2}\d{3}$/.test(license):
      vehicleType = "green";
      licenseState = "NY";
      break;

    case /^\d{4}$/.test(license) && (!state || state === "NYPD"):
      vehicleType = "NYPD";
      licenseState = "NY";
      break;

    case /^\d{7}$/.test(license):
      vehicleType = "USPS";
      licenseState = "NY";
      break;

    case /^\d{5}M[A-Z]$/.test(license):
      vehicleType = "commercial";
      licenseState = "NY";
      break;

    default:
      vehicleType = "private";
      break;
  }

  return { vehicleType, license, licenseState, medallion };
}