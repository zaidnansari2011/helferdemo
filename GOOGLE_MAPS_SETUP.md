# Google Maps Setup Guide

To use the warehouse location picker, you need to set up Google Maps API. This implementation uses the [`@react-google-maps/api`](https://github.com/JustFly1984/react-google-maps-api) library for comprehensive React integration.

## 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Geocoding API
   
   **Note**: We use the non-legacy Geocoding API instead of the legacy Places API to avoid the `LegacyApiNotActivatedMapError`.
4. Go to "Credentials" and create an API key
5. Restrict the API key to your domain for security

## 2. Add Environment Variable

Create a `.env.local` file in the `web-app` directory with:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

## 3. Security Note

- Never commit your API key to version control
- Add `.env.local` to your `.gitignore` file
- Consider setting up API key restrictions in Google Cloud Console

## 4. Features

The location picker provides:
- **Interactive Google Map** for selecting warehouse locations
- **Smart autocomplete search** with dropdown suggestions as you type
- **Debounced search** (300ms delay) to prevent API spam
- **Click-to-place marker** functionality
- **Drag and drop marker** positioning for fine-tuning
- **Automatic pincode detection** from coordinates using reverse geocoding
- **Real-time location updates** with latitude/longitude display
- **India-focused search** with country restrictions for better results
- **Legacy API compliance** - uses only current APIs to avoid deprecation warnings
- **Responsive UI** with loading states and empty results handling

## Legacy API Warning

If you encounter the error `LegacyApiNotActivatedMapError`, it means the application was trying to use legacy Google Maps APIs that are being phased out on March 1, 2025. This implementation has been updated to use only non-legacy APIs:

- ✅ **Maps JavaScript API** (current)
- ✅ **Geocoding API** (current) 
- ❌ **Places API** (legacy - removed)

Learn more about [Google Maps Platform Legacy APIs](https://developers.google.com/maps/legacy#LegacyApiNotActivatedMapError).

## Troubleshooting

If the map doesn't load:
1. Check that your API key is correct
2. Verify that the required APIs are enabled
3. Check browser console for any error messages
4. Ensure your domain is allowlisted if using API restrictions
5. Make sure you're not using any legacy APIs (Places API, Directions API, Distance Matrix API) 