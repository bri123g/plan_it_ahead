import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

interface Itinerary {
  itinerary_id: number;
  user_id: number;
  title?: string;
  start_date?: string;
  end_date?: string;
  total_cost?: number;
  created_at?: string;
}

export function MyItineraries() {
  const navigate = useNavigate();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadItineraries();
  }, []);

  const loadItineraries = async () => {
    try {
      setLoading(true);
      const response = await api.get('/itineraries');
      setItineraries(response.data || []);
    } catch (err) {
      setError('Failed to load itineraries');
      console.error('Failed to load itineraries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itineraryId: number) => {
    if (!confirm('Are you sure you want to delete this itinerary?')) {
      return;
    }
    
    try {
      setDeletingId(itineraryId);
      await api.delete(`/itineraries/${itineraryId}`);
      setItineraries(prev => prev.filter(it => it.itinerary_id !== itineraryId));
    } catch (err) {
      console.error('Failed to delete itinerary:', err);
      setError('Failed to delete itinerary');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const calculateDays = (start?: string, end?: string) => {
    if (!start || !end) return null;
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : null;
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent pb-1">
              My Itineraries
            </h1>
            <p className="text-gray-600 mt-2">
              {itineraries.length} {itineraries.length === 1 ? 'trip' : 'trips'} planned
            </p>
          </div>
          <Button 
            onClick={() => navigate('/itineraries/create')}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <span className="mr-2">✈️</span>
            Plan New Trip
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Empty State */}
        {itineraries.length === 0 && !error && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="py-16 text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">No trips yet</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Start planning your next adventure! Create an itinerary to organize flights, hotels, and activities.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={() => navigate('/itineraries/create')}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  Create Itinerary
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/ai')}
                  className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                >
                  Use AI Generator
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Itineraries Grid */}
        {itineraries.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {itineraries.map((itinerary) => {
              const days = calculateDays(itinerary.start_date, itinerary.end_date);
              const isDeleting = deletingId === itinerary.itinerary_id;
              
              return (
                <Card 
                  key={itinerary.itinerary_id} 
                  className={`bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group overflow-hidden ${isDeleting ? 'opacity-50' : ''}`}
                >
                  {/* Decorative top bar */}
                  <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                  
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle 
                        className="text-xl font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors cursor-pointer"
                        onClick={() => navigate(`/itineraries/${itinerary.itinerary_id}`)}
                      >
                        {itinerary.title || `Trip #${itinerary.itinerary_id}`}
                      </CardTitle>
                      {days && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
                          {days} {days === 1 ? 'day' : 'days'}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {/* Dates */}
                    {(itinerary.start_date || itinerary.end_date) && (
                      <div className="flex items-center gap-2 text-gray-600 mb-3">
                        <span className="text-lg">📅</span>
                        <span className="text-sm">
                          {formatDate(itinerary.start_date)} 
                          {itinerary.end_date && ` - ${formatDate(itinerary.end_date)}`}
                        </span>
                      </div>
                    )}
                    
                    {/* Cost */}
                    {itinerary.total_cost !== null && itinerary.total_cost !== undefined && (
                      <div className="flex items-center gap-2 text-gray-600 mb-4">
                        <span className="text-lg">💰</span>
                        <span className="text-sm font-medium text-green-600">
                          ${itinerary.total_cost.toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                      <Button 
                        variant="default"
                        size="sm"
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => navigate(`/itineraries/${itinerary.itinerary_id}`)}
                      >
                        View Details
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(itinerary.itinerary_id);
                        }}
                        disabled={isDeleting}
                      >
                        {isDeleting ? '...' : '🗑️'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Quick Actions Footer */}
        {itineraries.length > 0 && (
          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm mb-4">Looking to plan something new?</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => navigate('/itineraries/create')}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
              >
                <span className="mr-2">✈️</span>
                Create New Trip
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/ai')}
                className="border-purple-300 text-purple-600 hover:bg-purple-50"
              >
                <span className="mr-2">✨</span>
                AI Trip Generator
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

