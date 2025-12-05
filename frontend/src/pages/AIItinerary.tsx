import { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuthHook';
import { Button } from '../components/ui/button';

export function AIItinerary() {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [itinerary, setItinerary] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateItinerary = async () => {
    if (!destination || !startDate || !endDate) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/ai/generate-itinerary', {
        destination,
        start_date: startDate,
        end_date: endDate,
        budget: budget ? parseFloat(budget) : null
      });
      setItinerary(response.data);
    } catch (err: any) {
      setError(err.response?.data?.msg || 'Failed to generate itinerary');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendations = async () => {
    if (!destination) {
      setError('Please enter a destination');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/ai/recommend-attractions', {
        destination,
        current_itinerary: itinerary?.days || []
      });
      setRecommendations(response.data.recommendations || []);
    } catch (err: any) {
      setError(err.response?.data?.msg || 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">AI Itinerary Generator</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Generate Itinerary</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Destination</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., Paris, France"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Budget (optional)</label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., 2000"
              />
            </div>
            
            <Button onClick={generateItinerary} disabled={loading} className="w-full">
              {loading ? 'Generating...' : 'Generate Itinerary'}
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="mt-6">
            <Button onClick={getRecommendations} variant="outline" className="w-full">
              Get Recommendations
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {itinerary && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Generated Itinerary</h2>
              <div className="space-y-4">
                {itinerary.days?.map((day: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Day {day.day}: {day.date}</h3>
                    <div className="space-y-2">
                      {day.activities?.map((activity: any, actIndex: number) => (
                        <div key={actIndex} className="text-sm">
                          <span className="font-medium">{activity.time}</span> - {activity.activity}
                          {activity.estimated_cost && (
                            <span className="text-gray-600 ml-2">${activity.estimated_cost}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recommendations.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
              <div className="space-y-2">
                {recommendations.map((rec, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <h3 className="font-medium">{rec.name}</h3>
                    <p className="text-sm text-gray-600">{rec.reasoning}</p>
                    {rec.estimated_cost && (
                      <p className="text-sm mt-1">Estimated cost: ${rec.estimated_cost}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

