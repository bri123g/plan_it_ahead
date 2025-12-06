import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

interface SavedFlight {
  flight_num: string;
  airline: string;
  from_airport: string;
  to_airport: string;
  from_city: string;
  to_city: string;
  departure_time?: string;
  arrival_time?: string;
  price: number;
  duration?: string;
}

interface SavedItem {
  name: string;
  cost: number;
  type: string;
}

interface Itinerary {
  title?: string;
  start_date?: string;
  end_date?: string;
  total_cost?: number;
}

interface BudgetBreakdown {
  total_budget: number;
  breakdown: {
    flights: number;
    hotels: number;
    attractions: number;
    other: number;
  };
}

interface SavedData {
  itinerary_id: number;
  total_cost: number;
  breakdown: {
    flights: number;
    hotels: number;
    attractions: number;
    other: number;
  };
  saved_flights: SavedFlight[];
  saved_items: SavedItem[];
}

export function ItineraryBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState<BudgetBreakdown | null>(null);
  const [savedFlights, setSavedFlights] = useState<SavedFlight[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    if (id) {
      loadItinerary();
      // First check localStorage, then fallback to API if needed
      const hasLocalData = loadSavedData();
      if (!hasLocalData) {
        calculateBudget();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadItinerary = async () => {
    try {
      const response = await api.get(`/itineraries/${id}`);
      setItinerary(response.data);
    } catch (err) {
      console.error('Failed to load itinerary:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedData = (): boolean => {
    // Load saved data from localStorage
    const savedDataStr = localStorage.getItem('planit_saved_data');
    if (savedDataStr) {
      try {
        const savedData: SavedData = JSON.parse(savedDataStr);
        if (savedData.itinerary_id === parseInt(id || '0')) {
          setSavedFlights(savedData.saved_flights || []);
          setSavedItems(savedData.saved_items || []);
          // Update budget from saved data (this has correct breakdown)
          setBudget({
            total_budget: savedData.total_cost,
            breakdown: savedData.breakdown
          });
          return true;
        }
      } catch (e) {
        console.error('Error parsing saved data:', e);
      }
    }
    return false;
  };

  const calculateBudget = async () => {
    try {
      const response = await api.get(`/itineraries/${id}/budget`);
      setBudget(response.data);
    } catch (err) {
      console.error('Failed to calculate budget:', err);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  // Group saved items by type
  const hotels = savedItems.filter(item => item.type === 'hotel');
  const attractions = savedItems.filter(item => item.type === 'attraction');
  const otherItems = savedItems.filter(item => !['hotel', 'attraction'].includes(item.type));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          {itinerary?.title || 'Itinerary Builder'}
        </h1>
        <Button onClick={() => navigate('/search')}>
          Add More Items
        </Button>
      </div>

      {itinerary?.start_date && itinerary?.end_date && (
        <p className="text-gray-600 mb-6">
          {new Date(itinerary.start_date).toLocaleDateString()} - {new Date(itinerary.end_date).toLocaleDateString()}
        </p>
      )}

      {budget && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Budget Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-4">${budget.total_budget.toFixed(2)}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Flights</p>
                <p className="font-semibold">${budget.breakdown.flights.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Hotels</p>
                <p className="font-semibold">${budget.breakdown.hotels.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Attractions</p>
                <p className="font-semibold">${budget.breakdown.attractions.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Other</p>
                <p className="font-semibold">${budget.breakdown.other.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flights Section */}
      {savedFlights.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ✈️ Flights ({savedFlights.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savedFlights.map((flight, idx) => (
                <div key={idx} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-lg">
                        {flight.from_airport} → {flight.to_airport}
                      </p>
                      <p className="text-gray-600">
                        {flight.from_city} to {flight.to_city}
                      </p>
                      <p className="text-sm text-gray-500">
                        {flight.airline} • {flight.flight_num}
                      </p>
                      {flight.departure_time && (
                        <p className="text-sm text-gray-500">
                          Departure: {new Date(flight.departure_time).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">${flight.price.toFixed(2)}</p>
                      {flight.duration && (
                        <p className="text-sm text-gray-500">{flight.duration}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hotels Section */}
      {hotels.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏨 Hotels ({hotels.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hotels.map((hotel, idx) => (
                <div key={idx} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold">{hotel.name}</p>
                    <p className="text-lg font-bold text-green-600">${hotel.cost.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attractions Section */}
      {attractions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🎯 Attractions ({attractions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attractions.map((attraction, idx) => (
                <div key={idx} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold">{attraction.name}</p>
                    <p className="text-lg font-bold text-green-600">${attraction.cost.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Items Section */}
      {otherItems.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 Other Items ({otherItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {otherItems.map((item, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-lg font-bold text-green-600">${item.cost.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {savedFlights.length === 0 && savedItems.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">
              No items in this itinerary yet.
            </p>
            <Button onClick={() => navigate('/search')}>
              Search & Add Items
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
