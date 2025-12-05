import { useState, useEffect } from 'react';
import api from '../services/api';
import { Button } from '../components/ui/button';

export function Companions() {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const findCompanions = async () => {
    if (!destination) {
      setError('Please enter a destination');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/matching/find-companions', {
        destination,
        start_date: startDate,
        end_date: endDate
      });
      setMatches(response.data.matches || []);
    } catch (err: any) {
      setError(err.response?.data?.msg || 'Failed to find companions');
    } finally {
      setLoading(false);
    }
  };

  const connectWithMatch = async (userId: number, compatibilityScore: number) => {
    try {
      await api.post('/matching/connect', {
        user_id: userId,
        compatibility_score: compatibilityScore
      });
      // Refresh matches
      findCompanions();
    } catch (err: any) {
      setError(err.response?.data?.msg || 'Failed to connect');
    }
  };

  useEffect(() => {
    // Load existing matches on mount
    api.get('/matching/matches')
      .then((response) => {
        setMatches(response.data.matches || []);
      })
      .catch(() => {
        // Ignore errors
      });
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Find Travel Companions</h1>

      <div className="mb-6 space-y-4 p-4 bg-gray-50 rounded-lg">
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
        
        <Button onClick={findCompanions} disabled={loading}>
          {loading ? 'Searching...' : 'Find Companions'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {matches.map((match) => (
          <div key={match.user_id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{match.name}</h3>
                <p className="text-sm text-gray-600">{match.email}</p>
                <div className="mt-2">
                  <span className="text-sm font-medium">
                    Compatibility: {match.compatibility_score}%
                  </span>
                  {match.shared_interests && match.shared_interests.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Shared interests: {match.shared_interests.join(', ')}
                    </p>
                  )}
                  {match.reasoning && (
                    <p className="text-sm text-gray-600 mt-1">{match.reasoning}</p>
                  )}
                </div>
              </div>
              <Button
                onClick={() => connectWithMatch(match.user_id, match.compatibility_score)}
              >
                Connect
              </Button>
            </div>
          </div>
        ))}
      </div>

      {matches.length === 0 && !loading && (
        <p className="text-center text-gray-500 mt-8">No matches found</p>
      )}
    </div>
  );
}

