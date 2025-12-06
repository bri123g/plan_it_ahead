import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

interface Flight {
  flight_id: string;
  id?: string;
  price: number;
  origin: string;
  destination: string;
  departure_date?: string;
  arrival_date?: string;
  departure_time?: string;
  arrival_time?: string;
  airline?: string;
  airline_code?: string;
  duration?: string;
}

export function CreateItinerary() {
  const navigate = useNavigate();
  const location = useLocation();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [passengers, setPassengers] = useState<number | ''>(1);
  const [outboundFlights, setOutboundFlights] = useState<Flight[]>([]);
  const [returnFlights, setReturnFlights] = useState<Flight[]>([]);
  const [selectedOutbound, setSelectedOutbound] = useState<string | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState<Array<{code: string; name: string; display_name: string; city?: string; country?: string}>>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<Array<{code: string; name: string; display_name: string; city?: string; country?: string}>>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  
  interface Recommendation {
    name: string;
    type?: string;
    reasoning: string;
    best_time?: string;
    duration_minutes?: number;
    estimated_cost?: number;
    location?: string;
    image_url?: string;
  }
  
  const [aiRecommendations, setAiRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    if (location.state) {
      const state = location.state as {
        destination?: string;
        departureDate?: string;
        returnDate?: string;
        recommendations?: Recommendation[];
      };
      
      if (state.departureDate) {
        setDepartureDate(state.departureDate);
      }
      if (state.returnDate) {
        setReturnDate(state.returnDate);
      }
      if (state.recommendations) {
        setAiRecommendations(state.recommendations);
      }
      
      if (state.destination) {
        const destinationCity = state.destination;
        searchAirports(destinationCity, false);
      }
    }
  }, [location.state]);

  const searchAirports = async (query: string, isOrigin: boolean) => {
    if (!query || query.length < 2) {
      if (isOrigin) {
        setOriginSuggestions([]);
        setShowOriginSuggestions(false);
      } else {
        setDestinationSuggestions([]);
        setShowDestinationSuggestions(false);
      }
      return;
    }

    try {
      const response = await api.get('/search/airports', { params: { query, limit: 10 } });
      const airports = response.data.airports || [];
      
      if (isOrigin) {
        setOriginSuggestions(airports);
        setShowOriginSuggestions(true);
      } else {
        setDestinationSuggestions(airports);
        setShowDestinationSuggestions(true);
      }
    } catch (err) {
      console.error('Failed to search airports:', err);
    }
  };

  const handleOriginChange = (value: string) => {
    setOrigin(value);
    searchAirports(value, true);
  };

  const handleDestinationChange = (value: string) => {
    setDestination(value);
    searchAirports(value, false);
  };

  const selectAirport = (airport: {code: string; name: string; display_name: string; city?: string; country?: string}, isOrigin: boolean) => {
    if (isOrigin) {
      setOrigin(airport.code);
      setShowOriginSuggestions(false);
    } else {
      setDestination(airport.code);
      setShowDestinationSuggestions(false);
    }
  };

  const searchFlights = async () => {
    if (!origin || !destination || !departureDate) {
      setError('Please fill in origin, destination, and departure date');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const outboundResponse = await api.get('/search/flights', {
        params: {
          origin: origin.toUpperCase(),
          destination: destination.toUpperCase(),
          departure_date: departureDate,
          passengers: Number(passengers) || 1
        }
      });
      setOutboundFlights(outboundResponse.data.flights || []);

      if (returnDate) {
        const returnResponse = await api.get('/search/flights', {
          params: {
            origin: destination.toUpperCase(),
            destination: origin.toUpperCase(),
            departure_date: returnDate,
            passengers: Number(passengers) || 1
          }
        });
        setReturnFlights(returnResponse.data.flights || []);
      }
    } catch (err) {
      const errorResponse = err as { response?: { data?: { msg?: string } } };
      setError(errorResponse.response?.data?.msg || 'Failed to search flights');
    } finally {
      setLoading(false);
    }
  };

  const createItinerary = async () => {
    if (!selectedOutbound || !departureDate || !returnDate) {
      setError('Please select flights and dates');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/itineraries/create-from-flights', {
        departure_date: departureDate,
        return_date: returnDate,
        title: title || undefined
      });

      const itineraryId = response.data.itinerary_id;

      const pendingFlights = [];
      
      const outboundFlight = outboundFlights.find(f => (f.flight_id || f.id) === selectedOutbound);
      if (outboundFlight) {
        pendingFlights.push({
          type: 'flight',
          data: {
            ...outboundFlight,
            name: `${origin} → ${destination}`,
            origin,
            destination,
            flight_type: 'outbound'
          },
          addedAt: new Date().toISOString()
        });
      }

      if (selectedReturn) {
        const returnFlight = returnFlights.find(f => (f.flight_id || f.id) === selectedReturn);
        if (returnFlight) {
          pendingFlights.push({
            type: 'flight',
            data: {
              ...returnFlight,
              name: `${destination} → ${origin}`,
              origin: destination,
              destination: origin,
              flight_type: 'return'
            },
            addedAt: new Date().toISOString()
          });
        }
      }

      const allPendingItems = [...pendingFlights];
      if (aiRecommendations.length > 0) {
        const storedRecs = localStorage.getItem('planit_ai_recommendations');
        const recommendations: Recommendation[] = storedRecs ? JSON.parse(storedRecs) : aiRecommendations;
        
        recommendations.forEach((rec: Recommendation) => {
          allPendingItems.push({
            type: 'attraction',
            data: {
              name: rec.name,
              description: rec.reasoning,
              price: rec.estimated_cost || 0,
              duration_minutes: rec.duration_minutes,
              location: rec.location,
              type: rec.type,
              best_time: rec.best_time
            },
            addedAt: new Date().toISOString()
          });
        });
        
        localStorage.removeItem('planit_ai_recommendations');
      }

      localStorage.setItem('planit_pending_items', JSON.stringify(allPendingItems));
      localStorage.setItem('planit_current_itinerary', JSON.stringify({
        itinerary_id: itineraryId,
        title: title || `Trip to ${destination}`,
        origin,
        destination,
        departure_date: departureDate,
        return_date: returnDate
      }));

      navigate('/search');
    } catch (err) {
      const errorResponse = err as { response?: { data?: { msg?: string } } };
      setError(errorResponse.response?.data?.msg || 'Failed to create itinerary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Create New Itinerary</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Flight Selection</CardTitle>
          <CardDescription>Select your departure and return flights</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Label htmlFor="origin">Origin</Label>
              <Input
                id="origin"
                value={origin}
                onChange={(e) => handleOriginChange(e.target.value)}
                onFocus={() => origin && originSuggestions.length > 0 && setShowOriginSuggestions(true)}
                onBlur={() => setTimeout(() => setShowOriginSuggestions(false), 200)}
                placeholder="Search airport or city..."
                className="mt-1"
              />
              {showOriginSuggestions && originSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {originSuggestions.map((airport, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onMouseDown={() => selectAirport(airport, true)}
                    >
                      <div className="font-medium">{airport.display_name}</div>
                      {airport.city && (
                        <div className="text-sm text-gray-600">{airport.city}, {airport.country}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                value={destination}
                onChange={(e) => handleDestinationChange(e.target.value)}
                onFocus={() => {
                  const state = location.state as { destination?: string } | null;
                  if (state?.destination && !destination) {
                    searchAirports(state.destination, false);
                  }
                  if (destination && destinationSuggestions.length > 0) {
                    setShowDestinationSuggestions(true);
                  }
                }}
                onBlur={() => setTimeout(() => setShowDestinationSuggestions(false), 200)}
                placeholder={(() => {
                  const state = location.state as { destination?: string } | null;
                  return state?.destination ? `Search airports in ${state.destination}...` : "Search airport or city...";
                })()}
                className="mt-1"
              />
              {showDestinationSuggestions && destinationSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {destinationSuggestions.map((airport, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onMouseDown={() => selectAirport(airport, false)}
                    >
                      <div className="font-medium">{airport.display_name}</div>
                      {airport.city && (
                        <div className="text-sm text-gray-600">{airport.city}, {airport.country}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="departure">Departure Date</Label>
              <Input
                id="departure"
                type="date"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="return">Return Date</Label>
              <Input
                id="return"
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="passengers">Passengers</Label>
            <Input
              id="passengers"
              type="number"
              min="1"
              value={passengers}
              onChange={(e) => setPassengers(e.target.value === '' ? '' : parseInt(e.target.value))}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="title">Itinerary Title (Optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Paris Adventure"
              className="mt-1"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button onClick={searchFlights} disabled={loading} className="w-full">
            {loading ? 'Searching...' : 'Search Flights'}
          </Button>
        </CardContent>
      </Card>

      {outboundFlights.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Outbound Flights</CardTitle>
            <CardDescription>Select your departure flight</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {outboundFlights.map((flight) => {
                const flightId = flight.flight_id || flight.id || '';
                const departureTime = flight.departure_time || flight.departure_date || '';
                const arrivalTime = flight.arrival_time || flight.arrival_date || '';
                return (
                  <div
                    key={flightId}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedOutbound === flightId
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedOutbound(flightId)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">
                          {flight.origin} → {flight.destination}
                        </p>
                        <p className="text-sm text-gray-600">
                          {departureTime} - {arrivalTime}
                        </p>
                        {flight.airline && (
                          <p className="text-sm text-gray-500">{flight.airline}</p>
                        )}
                      </div>
                      <p className="text-xl font-bold">${flight.price}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {returnFlights.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Return Flights</CardTitle>
            <CardDescription>Select your return flight</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {returnFlights.map((flight) => {
                const flightId = flight.flight_id || flight.id || '';
                const departureTime = flight.departure_time || flight.departure_date || '';
                const arrivalTime = flight.arrival_time || flight.arrival_date || '';
                return (
                  <div
                    key={flightId}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedReturn === flightId
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedReturn(flightId)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">
                          {flight.origin} → {flight.destination}
                        </p>
                        <p className="text-sm text-gray-600">
                          {departureTime} - {arrivalTime}
                        </p>
                        {flight.airline && (
                          <p className="text-sm text-gray-500">{flight.airline}</p>
                        )}
                      </div>
                      <p className="text-xl font-bold">${flight.price}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedOutbound && (
        <Button
          onClick={createItinerary}
          disabled={loading || !returnDate}
          className="w-full"
          size="lg"
        >
          {loading ? 'Creating...' : 'Create Itinerary'}
        </Button>
      )}
    </div>
  );
}

