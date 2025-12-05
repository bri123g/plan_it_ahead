import { useState } from 'react';
import api from '../services/api';
import { Button } from '../components/ui/button';

type SearchType = 'destinations' | 'attractions' | 'hotels' | 'flights';

export function Search() {
  const [searchType, setSearchType] = useState<SearchType>('attractions');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      let response;
      switch (searchType) {
        case 'destinations':
          response = await api.get('/search/destinations', { params: { query } });
          setResults(response.data.destinations || []);
          break;
        case 'attractions':
          response = await api.get('/search/attractions', { params: { location: query } });
          setResults(response.data.attractions || []);
          break;
        case 'hotels':
          response = await api.get('/search/hotels', { 
            params: { 
              location: query,
              check_in: '2024-12-01',
              check_out: '2024-12-05'
            } 
          });
          setResults(response.data.hotels || []);
          break;
        case 'flights':
          const [origin, destination] = query.split(' to ');
          response = await api.get('/search/flights', { 
            params: { 
              origin: origin?.trim(),
              destination: destination?.trim(),
              departure_date: '2024-12-01'
            } 
          });
          setResults(response.data.flights || []);
          break;
      }
    } catch (err: any) {
      setError(err.response?.data?.msg || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Search</h1>
      
      <div className="flex gap-2 mb-6">
        {(['destinations', 'attractions', 'hotels', 'flights'] as SearchType[]).map((type) => (
          <Button
            key={type}
            variant={searchType === type ? 'default' : 'outline'}
            onClick={() => setSearchType(type)}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Button>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchType === 'flights' ? 'Origin to Destination' : 'Search...'}
          className="flex-1 px-4 py-2 border rounded-md"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((item, index) => (
          <div key={index} className="border rounded-lg p-4 hover:shadow-lg transition">
            <h3 className="font-semibold text-lg mb-2">{item.name || item.title || 'Unknown'}</h3>
            {item.description && <p className="text-sm text-gray-600 mb-2">{item.description.substring(0, 100)}...</p>}
            {item.price && <p className="text-lg font-bold">${item.price}</p>}
            {item.rating && <p className="text-sm">Rating: {item.rating}</p>}
          </div>
        ))}
      </div>

      {results.length === 0 && !loading && query && (
        <p className="text-center text-gray-500 mt-8">No results found</p>
      )}
    </div>
  );
}

