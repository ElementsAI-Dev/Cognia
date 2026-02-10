/**
 * Geocoding Service
 * Provides address search and reverse geocoding using Nominatim (OpenStreetMap)
 */

import type {
  AddressDetail,
  GeocodingResult,
  MapPosition,
  UseGeocodingOptions,
} from '@/types/map';
import { proxyFetch } from '@/lib/network/proxy-fetch';
import { loggers } from '@/lib/logger';

const log = loggers.app;

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'Cognia/1.0';
const REQUEST_TIMEOUT = 10000;

interface NominatimSearchResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  importance: number;
  address?: NominatimAddress;
}

interface NominatimAddress {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  district?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  province?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

export class GeocodingService {
  private static instance: GeocodingService;
  private abortController: AbortController | null = null;

  private constructor() {}

  static getInstance(): GeocodingService {
    if (!GeocodingService.instance) {
      GeocodingService.instance = new GeocodingService();
    }
    return GeocodingService.instance;
  }

  async searchAddress(
    query: string,
    options: UseGeocodingOptions = {}
  ): Promise<GeocodingResult[]> {
    if (!query.trim()) {
      return [];
    }

    this.cancelPendingRequest();
    this.abortController = new AbortController();

    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: String(options.limit ?? 5),
    });

    if (options.language) {
      params.set('accept-language', options.language);
    }

    if (options.countryCode) {
      params.set('countrycodes', options.countryCode);
    }

    try {
      const response = await proxyFetch(
        `${NOMINATIM_BASE_URL}/search?${params.toString()}`,
        {
          headers: {
            'User-Agent': USER_AGENT,
          },
          signal: this.abortController.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding request failed: ${response.status}`);
      }

      const results = (await response.json()) as NominatimSearchResult[];
      return results.map((result) => this.mapToGeocodingResult(result));
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return [];
      }
      log.error('Address search failed', { error, query });
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  async reverseGeocode(
    position: MapPosition,
    options: UseGeocodingOptions = {}
  ): Promise<AddressDetail | null> {
    this.cancelPendingRequest();
    this.abortController = new AbortController();

    const params = new URLSearchParams({
      lat: String(position.latitude),
      lon: String(position.longitude),
      format: 'json',
      addressdetails: '1',
      zoom: '18',
    });

    if (options.language) {
      params.set('accept-language', options.language);
    }

    const timeoutId = setTimeout(() => {
      this.abortController?.abort();
    }, REQUEST_TIMEOUT);

    try {
      const response = await proxyFetch(
        `${NOMINATIM_BASE_URL}/reverse?${params.toString()}`,
        {
          headers: {
            'User-Agent': USER_AGENT,
          },
          signal: this.abortController.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Reverse geocoding failed: ${response.status}`);
      }

      const result = (await response.json()) as NominatimSearchResult;

      if (!result.address) {
        return null;
      }

      return this.mapToAddressDetail(result.address, result.display_name);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }
      log.error('Reverse geocoding failed', { error, position });
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  cancelPendingRequest(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private mapToGeocodingResult(result: NominatimSearchResult): GeocodingResult {
    return {
      position: {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
      },
      address: this.mapToAddressDetail(result.address, result.display_name),
      displayName: result.display_name,
      importance: result.importance,
      placeId: String(result.place_id),
      type: result.type,
    };
  }

  private mapToAddressDetail(
    address: NominatimAddress | undefined,
    displayName: string
  ): AddressDetail {
    if (!address) {
      return {
        formattedAddress: displayName,
        country: '',
      };
    }

    const city = address.city || address.town || address.village || '';
    const district = address.district || address.suburb || address.neighbourhood || '';

    return {
      formattedAddress: displayName,
      street: address.road,
      houseNumber: address.house_number,
      district,
      city,
      county: address.county,
      state: address.state,
      province: address.province,
      country: address.country || '',
      countryCode: address.country_code?.toUpperCase(),
      postcode: address.postcode,
    };
  }
}

export const geocodingService = GeocodingService.getInstance();
