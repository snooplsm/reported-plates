// Define an enum for the predefined keys (base keys without dynamic parts)
export enum ReportedKeys {
    Geo = 'geo_',
  }
  
  // Utility function to ensure type safety when retrieving and storing data in localStorage
  class Reported {
    // Constructor can be used if you need to initialize certain things later
    constructor(private storage: Storage = localStorage) {}
  
    // Method to get data from localStorage by key with optional dynamic part (id)
    get<T>(key: ReportedKeys, id?: string): T | null {
      const storageKey = id ? `${key}_${id}` : key; // Create dynamic key if id is provided
      const storedValue = this.storage.getItem(storageKey);
      if (storedValue) {
        try {
          return JSON.parse(storedValue) as T;
        } catch (e) {
          console.error(`Failed to parse stored value for key ${storageKey}`, e);
          return null;
        }
      }
      return null;
    }
  
    // Method to save data to localStorage with predefined keys, optionally dynamic
    set<T>(key: ReportedKeys, value: T, id?: string): void {
      const storageKey = id ? `${key}_${id}` : key; // Create dynamic key if id is provided
      try {
        this.storage.setItem(storageKey, JSON.stringify(value));
      } catch (e) {
        console.error(`Failed to save value for key ${storageKey}`, e);
      }
    }
  
    // Method to remove an item from localStorage by key with optional dynamic part (id)
    remove(key: ReportedKeys, id?: string): void {
      const storageKey = id ? `${key}_${id}` : key; // Create dynamic key if id is provided
      this.storage.removeItem(storageKey);
    }
  
    // Method to clear all predefined keys from localStorage
    clearAll(): void {
      Object.values(ReportedKeys).forEach((key) => {
        this.storage.removeItem(key);
      });
    }
  }

  const reported = new Reported()
  export default reported
  /*
  // Example usage:
  const reported = new Reported();
  
  // Save user settings for a specific user ID to localStorage
  const userSettings = { theme: 'dark', language: 'en' };
  reported.set(ReportedKeys.UserSettings, userSettings, '12345'); // Dynamic key with user ID
  
  // Retrieve user settings for a specific user ID from localStorage
  const savedUserSettings = reported.get<{ theme: string, language: string }>(ReportedKeys.UserSettings, '12345');
  console.log(savedUserSettings);
  
  // Save cart items for a specific user ID to localStorage
  const cartItems = [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }];
  reported.set(ReportedKeys.CartItems, cartItems, '12345'); // Dynamic key with user ID
  
  // Retrieve cart items for a specific user ID from localStorage
  const savedCartItems = reported.get<{ id: number, name: string }[]>(ReportedKeys.CartItems, '12345');
  console.log(savedCartItems);
  
  // Remove user settings for a specific user ID
  reported.remove(ReportedKeys.UserSettings, '12345');
  
  // Clear all predefined keys from localStorage
  reported.clearAll();
  */