"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
} from "@react-google-maps/api";
import { Label } from "./label";
import { Input } from "./input";
import { Loader2, MapPin } from "lucide-react";

interface LocationData {
  latitude: number;
  longitude: number;
  pincode: string;
  address?: string;
}

interface LocationSuggestion {
  id: string;
  address: string;
  lat: number;
  lng: number;
  pincode: string;
}

interface LocationPickerProps {
  value?: LocationData;
  onChange: (location: LocationData) => void;
  apiKey: string;
}

const libraries: ("geometry")[] = ["geometry"];

const mapContainerStyle = {
  width: "100%",
  height: "300px",
};

const defaultCenter = {
  lat: 19.0760,
  lng: 72.8777, // Default to Mumbai
};

function extractPincodeFromGeocoderResult(result: google.maps.GeocoderResult): string {
  if (!result.address_components) return "";
  
  for (const component of result.address_components) {
    if (component.types.includes("postal_code")) {
      return component.long_name;
    }
  }
  return "";
}

function reverseGeocode(
  lat: number,
  lng: number,
  callback: (pincode: string, address: string) => void
) {
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ location: { lat, lng } }, (results, status) => {
    if (status === "OK" && results?.[0]) {
      const pincode = extractPincodeFromGeocoderResult(results[0]);
      const address = results[0].formatted_address;
      callback(pincode, address);
    } else {
      callback("", "");
    }
  });
}

function searchLocations(
  query: string,
  callback: (suggestions: LocationSuggestion[]) => void
) {
  if (!query.trim()) {
    callback([]);
    return;
  }

  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ 
    address: query, 
    componentRestrictions: { country: "IN" } 
  }, (results, status) => {
    if (status === "OK" && results && results.length > 0) {
      const suggestions: LocationSuggestion[] = results
        .slice(0, 5) // Limit to 5 suggestions
        .filter(result => result.geometry?.location)
        .map((result, index) => {
          const location = result.geometry!.location!;
          const pincode = extractPincodeFromGeocoderResult(result);
          
          return {
            id: `${result.place_id || index}`,
            address: result.formatted_address || "",
            lat: location.lat(),
            lng: location.lng(),
            pincode,
          };
        });
      
      callback(suggestions);
    } else {
      callback([]);
    }
  });
}

export function LocationPicker({ value, onChange, apiKey }: LocationPickerProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const center = value 
    ? { lat: value.latitude, lng: value.longitude }
    : defaultCenter;

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback((query: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (query.trim().length >= 3) {
        setIsSearching(true);
        searchLocations(query, (results) => {
          setSuggestions(results);
          setShowSuggestions(true);
          setIsSearching(false);
        });
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        setIsSearching(false);
      }
    }, 1000); // 1000ms debounce
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  const handleSuggestionSelect = useCallback((suggestion: LocationSuggestion) => {
    onChange({
      latitude: suggestion.lat,
      longitude: suggestion.lng,
      pincode: suggestion.pincode,
      address: suggestion.address,
    });
    setSearchValue(suggestion.address);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.blur();
  }, [onChange]);

  const handleInputBlur = useCallback(() => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  }, []);

  const handleInputFocus = useCallback(() => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [suggestions.length]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const onMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    const lat = event.latLng?.lat();
    const lng = event.latLng?.lng();
    
    if (lat && lng) {
      reverseGeocode(lat, lng, (pincode, address) => {
        onChange({
          latitude: lat,
          longitude: lng,
          pincode,
          address,
        });
      });
    }
  }, [onChange]);

  const onMarkerDragEnd = useCallback((event: google.maps.MapMouseEvent) => {
    const lat = event.latLng?.lat();
    const lng = event.latLng?.lng();
    
    if (lat && lng) {
      reverseGeocode(lat, lng, (pincode, address) => {
        onChange({
          latitude: lat,
          longitude: lng,
          pincode,
          address,
        });
      });
    }
  }, [onChange]);

  return (
    <LoadScript
      googleMapsApiKey={apiKey}
      libraries={libraries}
      loadingElement={
        <div className="flex items-center justify-center h-64 bg-muted rounded-md border">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading Google Maps...</span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <div className="relative">
            <Input
              ref={inputRef}
              id="address-search"
              type="text"
              placeholder="Type at least 3 characters to search..."
              value={searchValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              disabled={isSearching}
              className="pr-8"
            />
            {isSearching && (
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          
          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  className="w-full px-3 py-2 text-left hover:bg-muted focus:bg-muted focus:outline-none transition-colors"
                  onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                  onClick={() => handleSuggestionSelect(suggestion)}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground truncate">
                        {suggestion.address}
                      </div>
                      {suggestion.pincode && (
                        <div className="text-xs text-muted-foreground">
                          Pincode: {suggestion.pincode}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {/* No results message */}
          {showSuggestions && suggestions.length === 0 && searchValue.length >= 3 && !isSearching && (
            <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg p-3">
              <div className="text-sm text-muted-foreground text-center">
                No locations found for "{searchValue}"
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="rounded-md border overflow-hidden">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={center}
              zoom={13}
              onLoad={onLoad}
              onUnmount={onUnmount}
              onClick={onMapClick}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
              }}
            >
              {value && (
                <Marker
                  position={{ lat: value.latitude, lng: value.longitude }}
                  draggable={true}
                  onDragEnd={onMarkerDragEnd}
                />
              )}
            </GoogleMap>
          </div>
        </div>
      </div>
    </LoadScript>
  );
} 