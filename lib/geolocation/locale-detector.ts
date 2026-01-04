/**
 * Locale Detector
 * Detects user locale based on geolocation for language/culture adaptation
 */

import { geolocationService } from './geolocation';
import { CountryInfo, LocaleInfo, GeolocationPosition } from '@/types/geolocation';

const COUNTRY_DATA: Record<string, CountryInfo> = {
  CN: {
    code: 'CN',
    name: 'China',
    locale: 'zh-CN',
    timezone: 'Asia/Shanghai',
    currency: 'CNY',
    languages: ['zh-CN', 'zh'],
  },
  TW: {
    code: 'TW',
    name: 'Taiwan',
    locale: 'zh-TW',
    timezone: 'Asia/Taipei',
    currency: 'TWD',
    languages: ['zh-TW', 'zh'],
  },
  HK: {
    code: 'HK',
    name: 'Hong Kong',
    locale: 'zh-HK',
    timezone: 'Asia/Hong_Kong',
    currency: 'HKD',
    languages: ['zh-HK', 'zh', 'en'],
  },
  US: {
    code: 'US',
    name: 'United States',
    locale: 'en-US',
    timezone: 'America/New_York',
    currency: 'USD',
    languages: ['en-US', 'en'],
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    locale: 'en-GB',
    timezone: 'Europe/London',
    currency: 'GBP',
    languages: ['en-GB', 'en'],
  },
  JP: {
    code: 'JP',
    name: 'Japan',
    locale: 'ja-JP',
    timezone: 'Asia/Tokyo',
    currency: 'JPY',
    languages: ['ja'],
  },
  KR: {
    code: 'KR',
    name: 'South Korea',
    locale: 'ko-KR',
    timezone: 'Asia/Seoul',
    currency: 'KRW',
    languages: ['ko'],
  },
  DE: {
    code: 'DE',
    name: 'Germany',
    locale: 'de-DE',
    timezone: 'Europe/Berlin',
    currency: 'EUR',
    languages: ['de'],
  },
  FR: {
    code: 'FR',
    name: 'France',
    locale: 'fr-FR',
    timezone: 'Europe/Paris',
    currency: 'EUR',
    languages: ['fr'],
  },
  ES: {
    code: 'ES',
    name: 'Spain',
    locale: 'es-ES',
    timezone: 'Europe/Madrid',
    currency: 'EUR',
    languages: ['es'],
  },
  IT: {
    code: 'IT',
    name: 'Italy',
    locale: 'it-IT',
    timezone: 'Europe/Rome',
    currency: 'EUR',
    languages: ['it'],
  },
  PT: {
    code: 'PT',
    name: 'Portugal',
    locale: 'pt-PT',
    timezone: 'Europe/Lisbon',
    currency: 'EUR',
    languages: ['pt'],
  },
  BR: {
    code: 'BR',
    name: 'Brazil',
    locale: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
    languages: ['pt-BR', 'pt'],
  },
  RU: {
    code: 'RU',
    name: 'Russia',
    locale: 'ru-RU',
    timezone: 'Europe/Moscow',
    currency: 'RUB',
    languages: ['ru'],
  },
  IN: {
    code: 'IN',
    name: 'India',
    locale: 'hi-IN',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    languages: ['hi', 'en-IN', 'en'],
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    locale: 'en-AU',
    timezone: 'Australia/Sydney',
    currency: 'AUD',
    languages: ['en-AU', 'en'],
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    locale: 'en-CA',
    timezone: 'America/Toronto',
    currency: 'CAD',
    languages: ['en-CA', 'en', 'fr-CA', 'fr'],
  },
  SG: {
    code: 'SG',
    name: 'Singapore',
    locale: 'en-SG',
    timezone: 'Asia/Singapore',
    currency: 'SGD',
    languages: ['en-SG', 'en', 'zh', 'ms', 'ta'],
  },
  MY: {
    code: 'MY',
    name: 'Malaysia',
    locale: 'ms-MY',
    timezone: 'Asia/Kuala_Lumpur',
    currency: 'MYR',
    languages: ['ms', 'en', 'zh'],
  },
  TH: {
    code: 'TH',
    name: 'Thailand',
    locale: 'th-TH',
    timezone: 'Asia/Bangkok',
    currency: 'THB',
    languages: ['th'],
  },
  VN: {
    code: 'VN',
    name: 'Vietnam',
    locale: 'vi-VN',
    timezone: 'Asia/Ho_Chi_Minh',
    currency: 'VND',
    languages: ['vi'],
  },
  ID: {
    code: 'ID',
    name: 'Indonesia',
    locale: 'id-ID',
    timezone: 'Asia/Jakarta',
    currency: 'IDR',
    languages: ['id'],
  },
  PH: {
    code: 'PH',
    name: 'Philippines',
    locale: 'fil-PH',
    timezone: 'Asia/Manila',
    currency: 'PHP',
    languages: ['fil', 'en'],
  },
  NL: {
    code: 'NL',
    name: 'Netherlands',
    locale: 'nl-NL',
    timezone: 'Europe/Amsterdam',
    currency: 'EUR',
    languages: ['nl'],
  },
  SE: {
    code: 'SE',
    name: 'Sweden',
    locale: 'sv-SE',
    timezone: 'Europe/Stockholm',
    currency: 'SEK',
    languages: ['sv'],
  },
  NO: {
    code: 'NO',
    name: 'Norway',
    locale: 'no-NO',
    timezone: 'Europe/Oslo',
    currency: 'NOK',
    languages: ['no', 'nb', 'nn'],
  },
  DK: {
    code: 'DK',
    name: 'Denmark',
    locale: 'da-DK',
    timezone: 'Europe/Copenhagen',
    currency: 'DKK',
    languages: ['da'],
  },
  FI: {
    code: 'FI',
    name: 'Finland',
    locale: 'fi-FI',
    timezone: 'Europe/Helsinki',
    currency: 'EUR',
    languages: ['fi', 'sv'],
  },
  PL: {
    code: 'PL',
    name: 'Poland',
    locale: 'pl-PL',
    timezone: 'Europe/Warsaw',
    currency: 'PLN',
    languages: ['pl'],
  },
  CZ: {
    code: 'CZ',
    name: 'Czech Republic',
    locale: 'cs-CZ',
    timezone: 'Europe/Prague',
    currency: 'CZK',
    languages: ['cs'],
  },
  AT: {
    code: 'AT',
    name: 'Austria',
    locale: 'de-AT',
    timezone: 'Europe/Vienna',
    currency: 'EUR',
    languages: ['de-AT', 'de'],
  },
  CH: {
    code: 'CH',
    name: 'Switzerland',
    locale: 'de-CH',
    timezone: 'Europe/Zurich',
    currency: 'CHF',
    languages: ['de-CH', 'de', 'fr-CH', 'fr', 'it-CH', 'it'],
  },
  BE: {
    code: 'BE',
    name: 'Belgium',
    locale: 'nl-BE',
    timezone: 'Europe/Brussels',
    currency: 'EUR',
    languages: ['nl-BE', 'nl', 'fr-BE', 'fr', 'de'],
  },
  IE: {
    code: 'IE',
    name: 'Ireland',
    locale: 'en-IE',
    timezone: 'Europe/Dublin',
    currency: 'EUR',
    languages: ['en-IE', 'en', 'ga'],
  },
  NZ: {
    code: 'NZ',
    name: 'New Zealand',
    locale: 'en-NZ',
    timezone: 'Pacific/Auckland',
    currency: 'NZD',
    languages: ['en-NZ', 'en', 'mi'],
  },
  ZA: {
    code: 'ZA',
    name: 'South Africa',
    locale: 'en-ZA',
    timezone: 'Africa/Johannesburg',
    currency: 'ZAR',
    languages: ['en-ZA', 'en', 'af', 'zu', 'xh'],
  },
  MX: {
    code: 'MX',
    name: 'Mexico',
    locale: 'es-MX',
    timezone: 'America/Mexico_City',
    currency: 'MXN',
    languages: ['es-MX', 'es'],
  },
  AR: {
    code: 'AR',
    name: 'Argentina',
    locale: 'es-AR',
    timezone: 'America/Buenos_Aires',
    currency: 'ARS',
    languages: ['es-AR', 'es'],
  },
  CL: {
    code: 'CL',
    name: 'Chile',
    locale: 'es-CL',
    timezone: 'America/Santiago',
    currency: 'CLP',
    languages: ['es-CL', 'es'],
  },
  CO: {
    code: 'CO',
    name: 'Colombia',
    locale: 'es-CO',
    timezone: 'America/Bogota',
    currency: 'COP',
    languages: ['es-CO', 'es'],
  },
  PE: {
    code: 'PE',
    name: 'Peru',
    locale: 'es-PE',
    timezone: 'America/Lima',
    currency: 'PEN',
    languages: ['es-PE', 'es'],
  },
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    locale: 'ar-AE',
    timezone: 'Asia/Dubai',
    currency: 'AED',
    languages: ['ar', 'en'],
  },
  SA: {
    code: 'SA',
    name: 'Saudi Arabia',
    locale: 'ar-SA',
    timezone: 'Asia/Riyadh',
    currency: 'SAR',
    languages: ['ar'],
  },
  EG: {
    code: 'EG',
    name: 'Egypt',
    locale: 'ar-EG',
    timezone: 'Africa/Cairo',
    currency: 'EGP',
    languages: ['ar'],
  },
  IL: {
    code: 'IL',
    name: 'Israel',
    locale: 'he-IL',
    timezone: 'Asia/Jerusalem',
    currency: 'ILS',
    languages: ['he', 'ar', 'en'],
  },
  TR: {
    code: 'TR',
    name: 'Turkey',
    locale: 'tr-TR',
    timezone: 'Europe/Istanbul',
    currency: 'TRY',
    languages: ['tr'],
  },
  GR: {
    code: 'GR',
    name: 'Greece',
    locale: 'el-GR',
    timezone: 'Europe/Athens',
    currency: 'EUR',
    languages: ['el'],
  },
  UA: {
    code: 'UA',
    name: 'Ukraine',
    locale: 'uk-UA',
    timezone: 'Europe/Kiev',
    currency: 'UAH',
    languages: ['uk'],
  },
  RO: {
    code: 'RO',
    name: 'Romania',
    locale: 'ro-RO',
    timezone: 'Europe/Bucharest',
    currency: 'RON',
    languages: ['ro'],
  },
  HU: {
    code: 'HU',
    name: 'Hungary',
    locale: 'hu-HU',
    timezone: 'Europe/Budapest',
    currency: 'HUF',
    languages: ['hu'],
  },
};

interface GeocodingResponse {
  address?: {
    country_code?: string;
    country?: string;
  };
}

export class LocaleDetector {
  private static instance: LocaleDetector;
  private cachedLocaleInfo: LocaleInfo | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000;

  private constructor() {}

  static getInstance(): LocaleDetector {
    if (!LocaleDetector.instance) {
      LocaleDetector.instance = new LocaleDetector();
    }
    return LocaleDetector.instance;
  }

  async detectLocale(forceRefresh: boolean = false): Promise<LocaleInfo> {
    if (!forceRefresh && this.cachedLocaleInfo && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
      return this.cachedLocaleInfo;
    }

    const browserLocale = this.getBrowserLocale();
    const systemLocale = await this.getSystemLocale();

    try {
      if (geolocationService.isSupported()) {
        const permissions = await geolocationService.checkPermissions();
        
        if (permissions.location === 'granted' || permissions.coarseLocation === 'granted') {
          const position = await geolocationService.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 86400000,
          });
          
          const country = await this.getCountryFromCoordinates(position);
          
          if (country) {
            const localeInfo: LocaleInfo = {
              country,
              detectedLocale: country.locale,
              browserLocale,
              systemLocale,
              confidence: 'high',
              source: 'geolocation',
            };
            
            this.cachedLocaleInfo = localeInfo;
            this.cacheTimestamp = Date.now();
            return localeInfo;
          }
        }
      }
    } catch (error) {
      console.warn('Geolocation detection failed:', error);
    }

    const detectedLocale = systemLocale || browserLocale;
    const country = this.getCountryFromLocale(detectedLocale);

    const localeInfo: LocaleInfo = {
      country,
      detectedLocale,
      browserLocale,
      systemLocale,
      confidence: systemLocale ? 'medium' : 'low',
      source: systemLocale ? 'system' : 'browser',
    };

    this.cachedLocaleInfo = localeInfo;
    this.cacheTimestamp = Date.now();
    return localeInfo;
  }

  getBrowserLocale(): string {
    if (typeof navigator === 'undefined') {
      return 'en';
    }

    const languages = navigator.languages || [navigator.language];
    return languages[0] || 'en';
  }

  async getSystemLocale(): Promise<string | null> {
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      try {
        const { locale } = await import('@tauri-apps/plugin-os');
        const systemLocale = await locale();
        return systemLocale || null;
      } catch {
        return null;
      }
    }
    return null;
  }

  private async getCountryFromCoordinates(
    position: GeolocationPosition
  ): Promise<CountryInfo | null> {
    try {
      const { latitude, longitude } = position.coords;
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=3&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'Cognia/1.0',
          },
        }
      );

      if (!response.ok) {
        return this.estimateCountryFromCoordinates(latitude, longitude);
      }

      const data = await response.json() as GeocodingResponse;
      const countryCode = data.address?.country_code?.toUpperCase();

      if (countryCode && COUNTRY_DATA[countryCode]) {
        return COUNTRY_DATA[countryCode];
      }

      return this.estimateCountryFromCoordinates(latitude, longitude);
    } catch {
      return this.estimateCountryFromCoordinates(
        position.coords.latitude,
        position.coords.longitude
      );
    }
  }

  private estimateCountryFromCoordinates(
    lat: number,
    lon: number
  ): CountryInfo | null {
    if (lat >= 18 && lat <= 54 && lon >= 73 && lon <= 135) {
      return COUNTRY_DATA['CN'];
    }
    if (lat >= 21.9 && lat <= 25.3 && lon >= 120 && lon <= 122) {
      return COUNTRY_DATA['TW'];
    }
    if (lat >= 30 && lat <= 45 && lon >= 129 && lon <= 146) {
      return COUNTRY_DATA['JP'];
    }
    if (lat >= 33 && lat <= 39 && lon >= 124 && lon <= 132) {
      return COUNTRY_DATA['KR'];
    }
    if (lat >= 25 && lat <= 50 && lon >= -125 && lon <= -66) {
      return COUNTRY_DATA['US'];
    }
    if (lat >= 49 && lat <= 60 && lon >= -8 && lon <= 2) {
      return COUNTRY_DATA['GB'];
    }
    if (lat >= 47 && lat <= 55 && lon >= 5 && lon <= 15) {
      return COUNTRY_DATA['DE'];
    }
    if (lat >= 41 && lat <= 51 && lon >= -5 && lon <= 10) {
      return COUNTRY_DATA['FR'];
    }

    return null;
  }

  private getCountryFromLocale(locale: string): CountryInfo | null {
    const normalizedLocale = locale.replace('_', '-');
    
    for (const country of Object.values(COUNTRY_DATA)) {
      if (country.locale === normalizedLocale) {
        return country;
      }
    }
    
    const langCode = normalizedLocale.split('-')[0];
    for (const country of Object.values(COUNTRY_DATA)) {
      if (country.languages.includes(langCode)) {
        return country;
      }
    }
    
    return null;
  }

  getCountryByCode(code: string): CountryInfo | null {
    return COUNTRY_DATA[code.toUpperCase()] || null;
  }

  getAllCountries(): CountryInfo[] {
    return Object.values(COUNTRY_DATA);
  }

  clearCache(): void {
    this.cachedLocaleInfo = null;
    this.cacheTimestamp = 0;
  }
}

export const localeDetector = LocaleDetector.getInstance();
