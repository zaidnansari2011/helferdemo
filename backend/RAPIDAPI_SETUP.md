# RapidAPI GST Verification Setup

## 1. Get RapidAPI Key

1. Go to [RapidAPI GST Verification API](https://rapidapi.com/suneetk92/api/gst-verification-api-get-profile-returns-data)
2. Click **Sign Up** (or Sign In if you have an account)
3. Subscribe to the API (Free tier available)
4. Copy your **X-RapidAPI-Key** from the API dashboard

## 2. Add to Environment Variables

In `backend/.env`:
```env
RAPIDAPI_KEY=your_rapidapi_key_here
```

## 3. That's It!

No additional services needed. The GST verification works directly through RapidAPI.

## API Usage

**Endpoint**: `GET /v1/gstin/{GSTIN}/details`

**Example**:
```
GET https://gst-verification-api-get-profile-returns-data.p.rapidapi.com/v1/gstin/27AAPFU0939F1ZV/details
```

**Headers**:
- `X-RapidAPI-Key`: Your API key
- `X-RapidAPI-Host`: gst-verification-api-get-profile-returns-data.p.rapidapi.com
- `Content-Type`: application/json

## Response Format

```json
{
  "gstin": "27AAPFU0939F1ZV",
  "lgnm": "Legal Name",
  "tradeNam": "Trade Name",
  "rgdt": "01/04/2017",
  "sts": "Active",
  "ctb": "Private Limited Company",
  "pradr": {
    "adr": "Full Address"
  }
}
```

## Testing

Test the integration from the onboarding form:
1. Enter a 15-digit GST number (e.g., `27AAPFU0939F1ZV`)
2. Click "Verify GST Number"
3. See verified details displayed

**No captcha required** - much simpler than the previous implementation!
