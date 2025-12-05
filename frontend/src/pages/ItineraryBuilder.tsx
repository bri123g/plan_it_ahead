import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';

export function ItineraryBuilder() {
  const { id } = useParams<{ id: string }>();
  const [itinerary, setItinerary] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState(0);

  useEffect(() => {
    if (id) {
      loadItinerary();
      loadItems();
      calculateBudget();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadItinerary = async () => {
    try {
      const response = await api.get(`/itineraries/${id}`);
      setItinerary(response.data);
    } catch (err) {
      console.error('Failed to load itinerary:', err);
    }
  };

  const loadItems = async () => {
    try {
      const response = await api.get(`/itineraries/${id}/items`);
      setItems(response.data.items || []);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateBudget = async () => {
    try {
      const response = await api.post(`/itineraries/${id}/budget`);
      setBudget(response.data.estimated_budget || 0);
    } catch (err) {
      console.error('Failed to calculate budget:', err);
    }
  };

  const removeItem = async (itemId: number) => {
    try {
      await api.delete(`/itineraries/${id}/items/${itemId}`);
      loadItems();
      calculateBudget();
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  // Group items by day
  const itemsByDay = items.reduce((acc, item) => {
    const day = item.day_number || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(item);
    return acc;
  }, {} as Record<number, any[]>);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">
        {itinerary?.title || 'Itinerary Builder'}
      </h1>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Budget Summary</h2>
        <p className="text-2xl font-bold">${budget.toFixed(2)}</p>
      </div>

      <div className="space-y-6">
        {Object.keys(itemsByDay).length > 0 ? (
          Object.entries(itemsByDay).map(([day, dayItems]) => {
            const typedDayItems = dayItems as any[];
            return (
              <div key={day} className="border rounded-lg p-4">
                <h2 className="text-xl font-semibold mb-4">Day {day}</h2>
                <div className="space-y-2">
                  {typedDayItems.map((item: any) => (
                    <div key={item.item_id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <h3 className="font-medium">{item.item_name}</h3>
                        {item.time && <p className="text-sm text-gray-600">{item.time}</p>}
                        {item.estimated_cost && <p className="text-sm">${item.estimated_cost}</p>}
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeItem(item.item_id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-center text-gray-500">No items in this itinerary yet</p>
        )}
      </div>
    </div>
  );
}

