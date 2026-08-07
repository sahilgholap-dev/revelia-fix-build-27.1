import mongoose, { Schema, Document } from 'mongoose';

/**
 * Cache for geocoding lookups. Keyed on a normalized form of the user's
 * input string so case/whitespace variations resolve to the same cache hit.
 *
 * Stores both resolved AND unresolvable lookups so we never retry a place
 * Haiku has already declined to identify (e.g., "Atlantis", typos with no
 * close match). `resolved: false` rows are treated as terminal — caller
 * gets null without burning another API call.
 */
export interface IGeocodeCache extends Document {
  inputKey: string;
  inputOriginal: string;
  lat: number | null;
  lng: number | null;
  timezone: string | null;
  normalized: string | null;
  resolved: boolean;
  modelUsed: string;
  createdAt: Date;
}

const GeocodeCacheSchema = new Schema<IGeocodeCache>({
  inputKey: { type: String, required: true, unique: true, index: true },
  inputOriginal: { type: String, required: true },
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
  timezone: { type: String, default: null },
  normalized: { type: String, default: null },
  resolved: { type: Boolean, default: false, required: true },
  modelUsed: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const GeocodeCache = mongoose.model<IGeocodeCache>(
  'GeocodeCache',
  GeocodeCacheSchema
);
