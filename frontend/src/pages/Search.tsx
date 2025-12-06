import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

type SearchType = 'attractions' | 'hotels';

interface SearchResult {
  name?: string;
  title?: string;
  description?: string;
  price?: number;
  price_per_night?: number;
  rating?: number;
  xid?: string;
  hotel_id?: string;
  hotel_key?: string;
  id?: string;
  image_url?: string;
  image?: string;
  thumbnail?: string;
  photo?: string;
  address?: string;
  type?: string;
  rate?: number;
  reviews?: number;
  best_time?: string;
  duration_minutes?: number;
  estimated_cost?: number;
  lat?: number;
  lon?: number;
  link?: string;
  currency?: string;
}

interface Itinerary {
  itinerary_id?: number;
  id?: number;
  title?: string;
  start_date?: string;
  end_date?: string;
  destination?: string;
}

interface AttractionDetail {
  lat?: number;
  lon?: number;
  [key: string]: unknown;
}

interface Activity {
  [key: string]: unknown;
}

interface Hotel extends SearchResult {
  image?: string;
  address?: string;
}

interface ApiResponse {
  itinerary_id?: number;
  [key: string]: unknown;
}

interface CurrentItinerary {
  itinerary_id: number;
  id?: number;
  title: string;
  origin?: string;
  destination?: string;
  departure_date?: string;
  return_date?: string;
  start_date?: string;
  end_date?: string;
}

const STORAGE_KEY = 'planit_pending_items';

interface PendingItem {
  type: 'flight' | 'hotel' | 'attraction';
  data: SearchResult;
  addedAt: string;
}

function getPendingItems(): PendingItem[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function addPendingItem(item: PendingItem): void {
  const items = getPendingItems();
  items.push(item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function clearPendingItems(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function Search() {
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState<SearchType>('hotels');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [attractionDetails, setAttractionDetails] = useState<Record<string, AttractionDetail>>({});
  const [activitiesMap, setActivitiesMap] = useState<Record<string, Activity[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [selectedItineraryId, setSelectedItineraryId] = useState<number | null>(null);
  const [dayNumber, setDayNumber] = useState(1);
  const [time, setTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [adding, setAdding] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [currentItinerary, setCurrentItinerary] = useState<CurrentItinerary | null>(null);

  useEffect(() => {
    loadItineraries();
    setPendingItems(getPendingItems());
    
    const storedItinerary = localStorage.getItem('planit_current_itinerary');
    if (storedItinerary) {
      const itinerary = JSON.parse(storedItinerary) as CurrentItinerary;
      setCurrentItinerary(itinerary);
      setSelectedItineraryId(itinerary.itinerary_id);
      
      if (itinerary.destination) {
        // Avoid auto-filling airport IATA codes (e.g., JFK) into the attractions search box
        const dest = (itinerary.destination || '').toString().trim();
        const isIata = /^[A-Z]{3}$/i.test(dest);
        if (!isIata) setQuery(dest);
      }
      if (itinerary.departure_date) {
        setCheckIn(itinerary.departure_date);
      }
      if (itinerary.return_date) {
        setCheckOut(itinerary.return_date);
      }
    }
    // If we open the page with attractions selected, trigger a search
    if (searchType === 'attractions') {
      const stored = localStorage.getItem('planit_current_itinerary');
      const storedItinerary: CurrentItinerary | null = stored ? JSON.parse(stored) : null;
      const dest = storedItinerary?.destination || query;
      // only auto-fill attractions when dest is not a 3-letter IATA code
      const isIata = dest ? (/^[A-Z]{3}$/i.test(dest.toString().trim())) : false;
      if (dest && !isIata) {
        setQuery(dest);
        // small delay to allow state to settle
        setTimeout(() => handleSearch(), 0);
      }
    }
    // If the page opens with hotels selected, auto-fill and search using the itinerary destination
    if (searchType === 'hotels') {
      const stored = localStorage.getItem('planit_current_itinerary');
      const storedItinerary: CurrentItinerary | null = stored ? JSON.parse(stored) : null;
      const hotelDest = storedItinerary?.destination || query;
      if (hotelDest && storedItinerary?.departure_date && storedItinerary?.return_date) {
        // Check if destination is an airport code (3 letters) and don't use it for hotel search
        const isIata = /^[A-Z]{3}$/i.test(hotelDest.toString().trim());
        if (!isIata) {
          setQuery(hotelDest);
        }
        setCheckIn(storedItinerary.departure_date);
        setCheckOut(storedItinerary.return_date);
        if (!isIata) {
          setTimeout(() => handleSearch('hotels'), 0);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-check localStorage when navigating back to this page
  useEffect(() => {
    const handleFocus = () => {
      const storedItinerary = localStorage.getItem('planit_current_itinerary');
      if (storedItinerary && !currentItinerary) {
        const itinerary = JSON.parse(storedItinerary) as CurrentItinerary;
        setCurrentItinerary(itinerary);
        setSelectedItineraryId(itinerary.itinerary_id);
      }
      setPendingItems(getPendingItems());
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentItinerary]);

  // compute a sensible default itinerary title:
  // - If current itinerary has a title, use it
  // - Otherwise if we have a location (currentItinerary.destination or query),
  //   return "Trip to <Location> <N>" where N is 1 + number of existing itineraries for that location
  // - Fallback to "Itinerary N"
  const defaultItineraryTitle = () => {
    if (currentItinerary && currentItinerary.title) return currentItinerary.title;

    const loc = (currentItinerary?.destination || query || '').toString().trim();
    if (loc) {
      const locKey = loc.toLowerCase();
      const sameForLocation = (itineraries || []).filter((it) => {
        const title = (it.title || '').toLowerCase();
        return title.includes(locKey) || (it.destination || '').toString().toLowerCase() === locKey;
      });
      const base = `Trip to ${loc}`;
      return `${base} ${sameForLocation.length + 1}`;
    }

    const count = (itineraries && itineraries.length) ? itineraries.length : 0;
    return `Itinerary ${count + 1}`;
  };

  useEffect(() => {
    // When user switches to attractions, auto-search using currentItinerary.destination if available
    if (searchType === 'attractions') {
      const locationQuery = (currentItinerary?.destination || query || '').toString().trim();
      const isIata = /^[A-Z]{3}$/i.test(locationQuery);
      // Only auto-fill and search for attractions when we have a non-IATA location
      if (locationQuery && !isIata) {
        setQuery(locationQuery);
      } else {
        // clear query so the placeholder shows instead of an airport code
        setQuery('');
      }
      // Do not call handleSearch here; switchSearchType triggers searches to avoid duplicate calls
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchType]);

  // Helper to switch tabs and clear/refresh results appropriately
  const switchSearchType = (type: SearchType) => {
    // clear existing results and expanded state when switching
    setResults([]);
    setAttractionDetails({});
    setActivitiesMap({});
    setSearchType(type);

    // Auto-search when switching to attractions or when hotels have dates
    setTimeout(() => {
      if (type === 'attractions') {
        // Prefer a city/location name over an airport code when auto-searching
        const dest = (currentItinerary?.destination || '').toString().trim();
        const isIata = /^[A-Z]{3}$/i.test(dest);
        const q = (!isIata && dest) ? dest : query;
        if (q) handleSearch('attractions');
      } else if (type === 'hotels') {
        if (checkIn && checkOut && query) handleSearch('hotels');
      }
    }, 0);
  };

  // Helper: detect if an item looks like a hotel response
  const isHotelLike = (item: SearchResult | null | undefined): boolean => {
    if (!item) return false;
    return !!(item.hotel_id || item.hotel_key || item.price_per_night || item.rating || item.address);
  };

  // Compute number of nights from two dates (minimum 1). If dates not provided, fall back to component state.
  const computeNights = (ci?: string, co?: string) => {
    const start = ci ?? checkIn;
    const end = co ?? checkOut;
    if (!start || !end) return 1;
    try {
      const inDate = new Date(start);
      const outDate = new Date(end);
      const diff = Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 1;
    } catch {
      return 1;
    }
  };

  // Fallback price range when provider price is unavailable
  const FALLBACK_LOW = 100;
  const FALLBACK_HIGH = 400;

  const formatCurrency = (n: number) => `$${Math.round(n)}`;
  
  // Deterministic fallback price per hotel based on a hash of the hotel key/name
  const getFallbackPriceForItem = (item: SearchResult | null | undefined): number => {
    const key = (item && (item.hotel_key || item.hotel_id || item.id || item.name || item.title)) || '';
    let str = String(key);
    if (!str) str = JSON.stringify(item || '');
    // djb2 hash
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h) + str.charCodeAt(i);
      h = h & h; // keep in 32-bit range
    }
    const range = FALLBACK_HIGH - FALLBACK_LOW + 1;
    const val = Math.abs(h) % range;
    return FALLBACK_LOW + val;
  };
  

  // Normalize attraction fields (ensure image_url exists)
  const normalizeAttraction = (item: SearchResult): SearchResult => {
    if (!item) return item;
    const normalized: SearchResult = { ...item };
    normalized.image_url = item.image_url || item.image || item.thumbnail || item.photo || undefined;
    // keep xid/id mapping consistent
    normalized.xid = item.xid || item.id || item.xid;
    // map to AI recommendation fields for consistent rendering
    normalized.name = normalized.name || normalized.title || '';
    normalized.description = normalized.description || normalized.description || '';
    normalized.best_time = item.best_time || undefined;
    normalized.duration_minutes = item.duration_minutes || undefined;
    normalized.estimated_cost = item.estimated_cost || item.price || undefined;
    return normalized;
  };

  // Normalize hotel fields (ensure image exists and price_per_night is present)
  const normalizeHotel = (item: SearchResult): Hotel => {
    if (!item) return item as Hotel;
    const normalized: Hotel = { ...item } as Hotel;
    normalized.image = item.image || item.thumbnail || item.image_url || item.photo || undefined;
    normalized.price_per_night = item.price_per_night || item.price || undefined;
    normalized.hotel_id = item.hotel_id || item.id || item.hotel_key || undefined;
    return normalized;
  };

  const loadItineraries = async () => {
    try {
      const response = await api.get('/itineraries');
      setItineraries(response.data || []);
    } catch (err) {
      console.error('Failed to load itineraries:', err);
    }
  };

  const handleSearch = async (forceType?: SearchType) => {
    const activeType = forceType || searchType;
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      let response;
      if (activeType === 'attractions') {
        // search attractions by location (city) using Serp-enriched endpoint
        response = await api.get('/search/attractions-serp', { params: { location: query } });
        // Debugging: log response for diagnosis if server returns unexpected shape
        console.debug('search/attractions response:', response.data);
        // If the attractions endpoint returned an attractions array, normalize/filter it
        if (response.data && response.data.attractions && Array.isArray(response.data.attractions)) {
          const raw = response.data.attractions || [];
          // Normalize each attraction and filter out items that look like hotels
          const normalized = raw.map(normalizeAttraction).filter((it: SearchResult) => !isHotelLike(it));
          // Debug: if any items were filtered out, log it
          console.debug('attractions fetched:', raw.length, 'kept:', normalized.length);

          setResults(normalized);
          setAttractionDetails({});
          setActivitiesMap({});
          if (normalized.length === 0 && raw.length > 0) {
            setError('Attractions endpoint returned results that appear to be hotels; none shown.');
          }
        } else {
          // If the response doesn't include attractions, don't populate with hotels.
          setResults([]);
          // Surface a helpful error so the user knows something unexpected happened
          setError('No attractions found (server returned unexpected data).');
        }
      } else if (activeType === 'hotels') {
        // Use explicit checkIn/checkOut if provided, otherwise fall back to currentItinerary dates
        const ci = checkIn || currentItinerary?.departure_date;
        const co = checkOut || currentItinerary?.return_date;
        if (!ci || !co) {
          setError('Check-in and check-out dates are required (use itinerary dates or enter dates)');
          setLoading(false);
          return;
        }

        // Persist derived dates into state so UI shows them
        if (!checkIn && ci) setCheckIn(ci);
        if (!checkOut && co) setCheckOut(co);

        // Prefer Serp TripAdvisor-backed hotels endpoint
        response = await api.get('/search/hotels', {
          params: {
            location: query,
            check_in: ci,
            check_out: co
          }
        });
        // Debugging: log hotel response
        console.debug('search/hotels response:', response.data);
        const rawHotels = response.data.hotels || [];
        const normalizedHotels = rawHotels.map(normalizeHotel);
        setResults(normalizedHotels);
      }
    } catch (err) {
      interface ApiError {
        response?: { data?: { msg?: string } };
      }
      const errorResponse = err as ApiError;
      setError(errorResponse.response?.data?.msg || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  

  const fetchAttractionDetails = async (xid: string, lat?: number, lon?: number) => {
    if (!xid) return;
    try {
      if (!attractionDetails[xid]) {
        const resp = await api.get(`/search/attractions/${xid}`);
        setAttractionDetails(prev => ({ ...prev, [xid]: resp.data }));
      }

      // fetch nearby activities (ticketed tours) using Amadeus endpoint if coords provided
      const details = attractionDetails[xid] || (await api.get(`/search/attractions/${xid}`)).data;
      const plat = lat || details.lat;
      const plon = lon || details.lon;
      if (plat && plon && !activitiesMap[xid]) {
        const actResp = await api.get('/search/activities', { params: { lat: plat, lon: plon, radius: 10 } });
        setActivitiesMap(prev => ({ ...prev, [xid]: actResp.data.activities || [] }));
      }
    } catch (e) {
      console.error('Failed to load attraction details or activities', e);
    }
  };

  const openAddModal = (item: SearchResult) => {
    setSelectedItem(item);
    setShowAddModal(true);
    setError('');
    // Prefer the current itinerary if present; otherwise leave selection empty so
    // the placeholder shows the suggested default title (e.g., "Itinerary 4")
    if (currentItinerary) {
      setSelectedItineraryId(currentItinerary.itinerary_id || null);
    } else {
      setSelectedItineraryId(null);
    }
    // No star-tier selection: modal will show provider price or a single fallback estimate
  };

  const closeModal = () => {
    setShowAddModal(false);
    setSelectedItem(null);
    setError('');
  };

  const handleAddToLocalStorage = () => {
    if (!selectedItem) return;

    const itemType = searchType === 'hotels' ? 'hotel' : 'attraction';
    
    // Calculate estimated_cost properly based on item type
    let estimatedCost = 0;
    if (itemType === 'hotel') {
      const nights = computeNights();
      const perNight = selectedItem.price_per_night || selectedItem.price || getFallbackPriceForItem(selectedItem);
      estimatedCost = Number(perNight || 0) * nights;
    } else {
      // Attraction: use existing price or generate fallback
      estimatedCost = selectedItem.price || selectedItem.estimated_cost || getFallbackPriceForItem(selectedItem);
    }
    
    // Store with calculated estimated_cost
    const pendingItem: PendingItem = {
      type: itemType,
      data: {
        ...selectedItem,
        estimated_cost: estimatedCost,
        price: estimatedCost // Also set price for consistency
      },
      addedAt: new Date().toISOString()
    };

    addPendingItem(pendingItem);
    setPendingItems(getPendingItems());
    setSuccessMessage(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} added to pending items!`);
    closeModal();
  };

  const handleAddToItinerary = async () => {
    if (!selectedItem) {
      setError('No item selected');
      return;
    }

    if (!selectedItineraryId) {
      handleAddToLocalStorage();
      return;
    }

    setAdding(true);
    setError('');

    try {
      const itemType = searchType === 'attractions' ? 'attraction' : 'hotel';
      const itemName = selectedItem.name || selectedItem.title || 'Unknown';
      // Compute estimated cost according to user's selected price option for hotels
      let estimatedCost = selectedItem.price || selectedItem.price_per_night || 0;
      if (itemType === 'hotel') {
        // compute nights using the dates (prefer state, but computeNights will fallback to itinerary dates)
        const nights = computeNights();
        // Use provider's per-night price when available, otherwise use deterministic fallback per-hotel
        const perNight = selectedItem.price_per_night || selectedItem.price || getFallbackPriceForItem(selectedItem);
        estimatedCost = Number(perNight || 0) * nights;
      }

      await api.post(`/itineraries/${selectedItineraryId}/items`, {
        item_type: itemType,
        item_name: itemName,
        estimated_cost: estimatedCost,
        day_number: dayNumber,
        time: searchType === 'attractions' ? time : undefined,
        duration_minutes: searchType === 'attractions' ? durationMinutes : undefined
      });

      // Also add to pending items so it shows up when saving
      handleAddToLocalStorage();
    } catch (err) {
      interface ApiError {
        response?: { data?: { msg?: string } };
      }
      const errorResponse = err as ApiError;
      setError(errorResponse.response?.data?.msg || 'Failed to add item to itinerary');
    } finally {
      setAdding(false);
    }
  };

  const handleSaveAllToItinerary = async () => {
    if (pendingItems.length === 0) {
      setError('No pending items to save');
      return;
    }

    setAdding(true);
    setError('');

    try {
      // Ensure we have an itinerary to save into. If none selected, try to create one.
      let itineraryId = selectedItineraryId as number | null;

          if (!itineraryId) {
        // Try to use the stored current itinerary
        const stored = localStorage.getItem('planit_current_itinerary');
        const storedItinerary: CurrentItinerary | null = stored ? JSON.parse(stored) : null;

        try {
          let createResp: { data: ApiResponse } | null = null;
          if (storedItinerary && storedItinerary.departure_date && storedItinerary.return_date) {
            // create using dates and optional title (uses create-from-flights endpoint)
                createResp = await api.post('/itineraries/create-from-flights', {
                  departure_date: storedItinerary.departure_date,
                  return_date: storedItinerary.return_date,
                  title: storedItinerary.title || defaultItineraryTitle()
                });
          } else {
            // Fallback: create an empty itinerary
                createResp = await api.post('/itineraries', { title: defaultItineraryTitle() });
          }

          if (createResp && createResp.data && createResp.data.itinerary_id) {
          itineraryId = createResp.data.itinerary_id;

          // Store a minimal current itinerary locally so UX shows the selection
          const title = storedItinerary?.title || `Itinerary ${ (itineraries?.length || 0) + 1 }`;
            const current: CurrentItinerary = {
            itinerary_id: itineraryId,
            title,
            origin: storedItinerary?.origin,
            destination: storedItinerary?.destination,
            departure_date: storedItinerary?.departure_date,
            return_date: storedItinerary?.return_date
          };
          localStorage.setItem('planit_current_itinerary', JSON.stringify(current));
          setCurrentItinerary(current);
          setSelectedItineraryId(itineraryId);
          } else {
            throw new Error('Failed to create itinerary: no ID returned');
          }
          // reload itineraries list so user can see it in the dropdown
          await loadItineraries();
        } catch (createErr) {
          interface ApiError {
            response?: { data?: { msg?: string } };
          }
          const errorResponse = createErr as ApiError;
          setError(errorResponse.response?.data?.msg || 'Failed to create itinerary');
          setAdding(false);
          return;
        }
      }

      // Prepare payload
      const flights = pendingItems.filter(item => item.type === 'flight').map(item => item.data);
      const items = pendingItems.filter(item => item.type !== 'flight').map(item => {
        const itemType = item.type || 'other';
        // Prioritize estimated_cost (pre-calculated with nights for hotels, fallback for attractions)
        const itemPrice = item.data?.estimated_cost || item.data?.price || item.data?.price_per_night || 0;
        return {
          name: item.data?.name || item.data?.title || 'Unknown',
          price: Number(itemPrice) || 0,
          type: itemType
        };
      });

      // Save to backend
      const response = await api.post(`/itineraries/${itineraryId}/save`, {
        flights,
        items
      });

      // Store per-itinerary (new format) and also in the old format for backwards compat
      const savedDataPayload = {
        itinerary_id: itineraryId,
        ...response.data
      };
      localStorage.setItem(`planit_saved_data_${itineraryId}`, JSON.stringify(savedDataPayload));
      localStorage.setItem('planit_saved_data', JSON.stringify(savedDataPayload));

      clearPendingItems();
      setPendingItems([]);
      localStorage.removeItem('planit_current_itinerary');
      setCurrentItinerary(null);
      setSuccessMessage('All items saved to itinerary!');
      navigate(`/itineraries/${itineraryId}`);
    } catch (err) {
      interface ApiError {
        response?: { data?: { msg?: string } };
      }
      const errorResponse = err as ApiError;
      setError(errorResponse.response?.data?.msg || 'Failed to save items');
    } finally {
      setAdding(false);
    }
  };

  const removePendingItem = (index: number) => {
    const items = getPendingItems();
    const removedItem = items[index];
    items.splice(index, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    setPendingItems(items);
    setSuccessMessage(`${removedItem.type.charAt(0).toUpperCase() + removedItem.type.slice(1)} removed from pending items!`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Search</h1>
      
      {currentItinerary && (
        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">{currentItinerary.title || `Itinerary ${currentItinerary.itinerary_id}`}</h2>
              <p className="text-sm opacity-90">
                {currentItinerary.origin && currentItinerary.destination 
                  ? `${currentItinerary.origin} → ${currentItinerary.destination} | `
                  : ''}
                {currentItinerary.departure_date && currentItinerary.return_date 
                  ? `${currentItinerary.departure_date} - ${currentItinerary.return_date}`
                  : currentItinerary.start_date && currentItinerary.end_date
                    ? `${currentItinerary.start_date} - ${currentItinerary.end_date}`
                    : ''}
              </p>
              <p className="text-sm mt-1">
                Add hotels and attractions to your trip. Click "Save All to Itinerary" when done.
              </p>
            </div>
            <Button 
              variant="secondary" 
              onClick={() => {
                if (pendingItems.length > 0 && selectedItineraryId) {
                  handleSaveAllToItinerary();
                } else {
                  navigate(`/itineraries/${currentItinerary.itinerary_id}`);
                }
              }}
            >
              {pendingItems.length > 0 ? 'Save & View Itinerary' : 'View Itinerary'}
            </Button>
          </div>
        </div>
      )}
      
      <div className="flex gap-2 mb-6">
        {(['attractions', 'hotels'] as SearchType[]).map((type) => (
          <Button
            key={type}
            variant="outline"
            className={searchType === type ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 hover:text-white' : 'hover:bg-gray-100'}
            onClick={() => switchSearchType(type)}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Button>
        ))}
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex gap-2">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchType === 'hotels' ? 'Search location for hotels...' : 'Search for attractions...'}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={() => handleSearch()} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {loading ? 'Searching...' : 'Search'}
          </Button>
          
        </div>
        
        {searchType === 'hotels' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="check_in">Check-in Date</Label>
              <Input
                id="check_in"
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="check_out">Check-out Date</Label>
              <Input
                id="check_out"
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </div>

      {pendingItems.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-bold mb-2">Pending Items ({pendingItems.length})</h3>
          <div className="space-y-2">
            {pendingItems.map((item, index) => (
              <div key={index} className="flex justify-between items-center bg-white p-2 rounded hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer">
                <span>
                  <strong>{item.type}:</strong> {item.data.name || item.data.title} 
                  {(item.data.price || item.data.price_per_night) && ` - $${item.data.price || item.data.price_per_night}`}
                </span>
                <Button variant="outline" size="sm" onClick={() => removePendingItem(index)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <select
              value={selectedItineraryId || ''}
              onChange={(e) => setSelectedItineraryId(e.target.value ? parseInt(e.target.value) : null)}
              className="flex-1 px-3 py-2 border rounded-md"
            >
              <option value="">{defaultItineraryTitle()}</option>
              {itineraries.map((it) => (
                <option key={it.itinerary_id || it.id} value={it.itinerary_id || it.id}>
                  {it.title || `Itinerary ${it.itinerary_id || it.id}`}
                </option>
              ))}
            </select>
            <Button onClick={handleSaveAllToItinerary} disabled={adding || !selectedItineraryId}>
              {adding ? 'Saving...' : 'Save All to Itinerary'}
            </Button>
            <Button variant="outline" onClick={() => { clearPendingItems(); setPendingItems([]); }}>
              Clear All
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((item, index) => {
          if (searchType === 'hotels') {
            // Render hotel card
            const hotel = item as Hotel;
            const nights = computeNights();
            const pricePerNight = hotel.price_per_night || hotel.price || null;
            let totalCost: number | null = null;
            let fallbackPerNight: number | null = null;
            if (pricePerNight) {
              totalCost = Number(pricePerNight) * nights;
            } else {
              fallbackPerNight = getFallbackPriceForItem(item);
              totalCost = fallbackPerNight * nights;
            }
            
            return (
              <Card key={index} className={`hover:shadow-lg transition`}>
                <div>
                  <CardHeader>
                    <CardTitle className="text-lg">{item.name || item.title || 'Unknown Hotel'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    { hotel.image && (
                      <img src={hotel.image} alt={item.name} className={`w-full object-cover rounded mb-2 h-36`} />
                    ) }
                    {pricePerNight ? (
                      <p className="text-green-600 font-bold mb-1">Price per night: {formatCurrency(Number(pricePerNight))}</p>
                    ) : (
                      <p className="text-sm text-gray-700 mb-1">Price per night: {formatCurrency(fallbackPerNight || 0)}</p>
                    )}
                    <p className="text-sm text-gray-700 mb-1">Total for {nights} night{nights > 1 ? 's' : ''}: <span className="font-semibold">{formatCurrency(totalCost || 0)}</span></p>
                    {item.rating && <p className="text-sm mb-1">Rating: {item.rating}</p>}
                    { hotel.address && <p className="text-sm text-gray-600 mb-2">{hotel.address}</p> }
                    
                    <div className="flex gap-2">
                      <Button onClick={() => openAddModal(item)} className="flex-1">Add to Itinerary</Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          }

          // Render attractions in the same card style as AI recommendations
          const xid = item.xid || item.id || '';
          return (
            <div 
              key={index} 
              className="border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
            >
              { item.image_url && (
                <div className="relative h-40 overflow-hidden">
                  <img 
                    src={item.image_url} 
                    alt={item.name || ''}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  { item.type && (
                    <span className="absolute top-2 right-2 text-xs bg-white/90 text-primary px-2 py-1 rounded-full font-medium">
                      {item.type}
                    </span>
                  )}
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-800 group-hover:text-primary transition-colors">{item.name}</h3>
                  <div className="flex items-center gap-2">
                    { item.rating && (
                      <div className="text-sm text-amber-700 font-semibold">{item.rating}★</div>
                    )}
                    { item.description && (
                      <div className="text-xs text-muted-foreground">({item.description.length})</div>
                    )}
                    {! item.image_url && item.type && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{item.type}</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description || ''}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {item.best_time && (
                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                      <span>🕐</span> {item.best_time}
                    </span>
                  )}
                  {item.duration_minutes && (
                    <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-full flex items-center gap-1">
                      <span>⏱️</span> {item.duration_minutes} min
                    </span>
                  )}
                  {item.rating && (
                    <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-full flex items-center gap-1">
                      <span>⭐</span> {item.rating}
                    </span>
                  )}
                </div>
                {item.lat && item.lon && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><span>📍</span> {typeof item.lat === 'number' && typeof item.lon === 'number' ? `${item.lat.toFixed(3)}, ${item.lon.toFixed(3)}` : ''}</p>
                )}
                <div className="mt-3 flex gap-2">
                  { item.price && (
                    <div className="text-green-600 font-bold mr-2">{item.currency ? `${item.currency} ${item.price}` : `$${item.price}`}</div>
                  )}
                  <Button onClick={() => openAddModal({ ...item, xid, name: item.name, title: item.name, description: item.description })} className="flex-1">Add to Itinerary</Button>
                  { item.link ? (
                    <a href={item.link} target="_blank" rel="noreferrer" className="inline-block">
                      <Button variant="outline">View</Button>
                    </a>
                  ) : (
                    <Button variant="outline" onClick={() => { if (xid) { fetchAttractionDetails(xid, item.lat, item.lon); } }}>Details</Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {results.length === 0 && !loading && query && (
        <p className="text-center text-gray-500 mt-8">No results found</p>
      )}

      {showAddModal && selectedItem && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <Card className="w-full max-w-md mx-4 bg-white">
            <CardHeader>
              <CardTitle>Add to Itinerary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Item</Label>
                <p className="font-medium">{selectedItem.name || selectedItem.title}</p>
                {(selectedItem.price || selectedItem.price_per_night) && (
                  <p className="text-green-600 font-bold">${selectedItem.price || selectedItem.price_per_night}</p>
                )}
              </div>

              {itineraries.length > 0 ? (
                <div>
                  <Label htmlFor="itinerary">Select Itinerary (optional)</Label>
                  <select
                    id="itinerary"
                    value={selectedItineraryId || ''}
                    onChange={(e) => setSelectedItineraryId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border rounded-md mt-1"
                  >
                    <option value="">{`-- ${defaultItineraryTitle()} --`}</option>
                    {itineraries.map((it) => (
                      <option key={it.itinerary_id || it.id} value={it.itinerary_id || it.id}>
                        {it.title || `Itinerary ${it.itinerary_id || it.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  No itineraries found. Item will be added to pending items.
                </p>
              )}

              

              {searchType === 'attractions' && selectedItineraryId && (
                <>
                  <div>
                    <Label htmlFor="day">Day Number</Label>
                    <Input
                      id="day"
                      type="number"
                      min="1"
                      value={dayNumber}
                      onChange={(e) => setDayNumber(parseInt(e.target.value) || 1)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="time">Start Time (HH:MM)</Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="15"
                      step="15"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleAddToItinerary}
                  disabled={adding}
                  className="flex-1"
                >
                  {adding ? 'Adding...' : (selectedItineraryId ? 'Add to Itinerary' : 'Add to Pending')}
                </Button>
                <Button
                  variant="outline"
                  onClick={closeModal}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
