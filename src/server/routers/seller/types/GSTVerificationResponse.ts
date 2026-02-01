export type GSTVerificationResponse = {
  success: boolean;
  data: {
    stateJurisdictionCode: string;
    legalName: string;
    stateJurisdiction: string;
    taxType: string;
    additionalAddress: Array<{
      address: {
        buildingName: string;
        location: string;
        street: string;
        buildingNumber: string;
        district: string;
        locality: string;
        pincode: string;
        landMark: string;
        stateCode: string;
        geoCodeLevel: string;
        floorNumber: string;
        landmark: string;
      };
      nature: string;
    }>;
    cancelledDate: string;
    gstNumber: string;
    natureOfBusinessActivity: Array<string>;
    lastUpdateDate: string;
    registrationDate: string;
    constitutionOfBusiness: string;
    principalAddress: {
      address: {
        buildingName: string;
        location: string;
        street: string;
        buildingNumber: string;
        district: string;
        locality: string;
        pincode: string;
        landMark: string;
        stateCode: string;
        geoCodeLevel: string;
        floorNumber: string;
        landmark: string;
      };
      nature: string;
    };
    tradeName: string;
    status: string;
    centerJurisdictionCode: string;
    centerJurisdiction: string;
    eInvoiceStatus: string;
  };
  generatedTimeStamps: number;
};
