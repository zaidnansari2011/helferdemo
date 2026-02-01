import type { GSTVerificationResponse } from "../types/GSTVerificationResponse";
import { gstLogger } from "../../../utils/logger";

// Helper function to format address from GST data
function formatAddressFromGST(
  address: GSTVerificationResponse["data"]["principalAddress"]["address"]
): string {
  if (!address) return "";

  return [
    address.buildingNumber,
    address.buildingName,
    address.street,
    address.locality,
    address.location,
    address.district,
    address.stateCode,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ");
}

export const getGSTData = async (gstNumber: string) => {
  gstLogger.debug('Checking GST:', gstNumber);
  gstLogger.debug('RAPID_API_KEY available:', !!process.env.RAPID_API_KEY);
  
  // In development mode, return mock data if API fails
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // DEV BYPASS: If GST number starts with "TEST" or "DEV", return mock data immediately
  // This allows testing without hitting the real API or needing valid GST numbers
  const upperGST = gstNumber.toUpperCase();
  if (isDevelopment && (upperGST.startsWith('TEST') || upperGST.startsWith('DEV'))) {
    gstLogger.debug('DEV BYPASS: Returning mock data for test GST number');
    return {
      success: true,
      gstNumber: gstNumber,
      businessName: `Test Business - ${gstNumber}`,
      constitution: "Private Limited Company",
      businessType: "Wholesale Business",
      addresses: [
        {
          id: "principal",
          type: "Principal Address",
          formattedAddress: "123, Test Street, Test Area, Test City, Maharashtra, 400001",
          state: "Maharashtra",
          pincode: "400001",
          raw: {},
        },
        {
          id: "additional-0",
          type: "Additional Address 1",
          formattedAddress: "456, Sample Road, Sample Area, Mumbai, Maharashtra, 400002",
          state: "Maharashtra",
          pincode: "400002",
          raw: {},
        },
        {
          id: "additional-1",
          type: "Additional Address 2",
          formattedAddress: "789, Warehouse Lane, Industrial Area, Pune, Maharashtra, 411001",
          state: "Maharashtra",
          pincode: "411001",
          raw: {},
        }
      ],
      raw: {},
    };
  }
  
  try {
    const response = await fetch(
      `https://gst-insights-api.p.rapidapi.com/getGSTDetailsUsingGST/${gstNumber}`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-host": "gst-insights-api.p.rapidapi.com",
          "x-rapidapi-key": process.env.RAPID_API_KEY || "",
        },
      }
    );
    
    gstLogger.debug('GST API Response Status:', response.status);
    const data = (await response.json()) as GSTVerificationResponse;
    gstLogger.debug('GST API Response Data:', JSON.stringify(data, null, 2));

    if (response.ok && data && data.success) {
    // Format addresses on the server side
    const formattedAddresses = [];

    // Add principal address
    if (data.data.principalAddress?.address) {
      formattedAddresses.push({
        id: "principal",
        type: "Principal Address",
        formattedAddress: formatAddressFromGST(
          data.data.principalAddress.address
        ),
        state: data.data.principalAddress.address.stateCode || "",
        pincode: data.data.principalAddress.address.pincode || "",
        raw: data.data.principalAddress.address,
      });
    }

    // Add additional addresses
    if (
      data.data.additionalAddress &&
      Array.isArray(data.data.additionalAddress)
    ) {
      data.data.additionalAddress.forEach((addrData: any, index: number) => {
        if (addrData?.address) {
          formattedAddresses.push({
            id: `additional-${index}`,
            type: `Additional Address ${index + 1}`,
            formattedAddress: formatAddressFromGST(addrData.address),
            state: addrData.address.stateCode || "",
            pincode: addrData.address.pincode || "",
            raw: addrData.address,
          });
        }
      });
    }

    return {
      success: true,
      gstNumber: gstNumber,
      businessName: data.data.tradeName || "",
      constitution: data.data.constitutionOfBusiness || "",
      businessType: data.data.natureOfBusinessActivity || "",
      addresses: formattedAddresses,
      raw: data, // Keep raw data for any edge cases
    };
  }
  
  // If API fails in development, return mock data for testing
  if (isDevelopment) {
    gstLogger.debug('GST API failed, returning mock data for development');
    return {
      success: true,
      gstNumber: gstNumber,
      businessName: "Test Business Pvt Ltd",
      constitution: "Private Limited Company",
      businessType: "Wholesale Business",
      addresses: [
        {
          id: "principal",
          type: "Principal Address",
          formattedAddress: "123, Test Street, Test Area, Test City, Maharashtra, 400001",
          state: "Maharashtra",
          pincode: "400001",
          raw: {},
        },
        {
          id: "additional-0",
          type: "Additional Address 1",
          formattedAddress: "456, Sample Road, Sample Area, Mumbai, Maharashtra, 400002",
          state: "Maharashtra",
          pincode: "400002",
          raw: {},
        }
      ],
      raw: {},
    };
  }
  
  // In production, throw error
  throw new Error('GST API verification failed');
} catch (error) {
  gstLogger.error('GST API Error:', error);
  
  // In development, return mock data on any error
  if (isDevelopment) {
    gstLogger.debug('Returning mock GST data for development');
    return {
      success: true,
      gstNumber: gstNumber,
      businessName: "Test Business Pvt Ltd",
      constitution: "Private Limited Company", 
      businessType: "Wholesale Business",
      addresses: [
        {
          id: "principal",
          type: "Principal Address",
          formattedAddress: "123, Test Street, Test Area, Test City, Maharashtra, 400001",
          state: "Maharashtra",
          pincode: "400001",
          raw: {},
        }
      ],
      raw: {},
    };
  }
  
  throw error;
}
};
