import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

interface Activity {
  time: string;
  activity: string;
  estimated_cost?: number;
  type?: string;
  duration_minutes?: number;
  description?: string;
}

interface Day {
  day: number;
  date: string;
  activities?: Activity[];
}

interface Itinerary {
  destination?: string;
  start_date?: string;
  end_date?: string;
  total_days?: number;
  estimated_budget?: number;
  days?: Day[];
  summary?: string;
  tips?: string[];
}

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

type OutputMode = 'none' | 'itinerary' | 'recommendations';

export function AIItinerary() {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<number>>(new Set());
  const [statusMessage, setStatusMessage] = useState<{ index: number; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [outputMode, setOutputMode] = useState<OutputMode>('none');

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
      setOutputMode('itinerary');
    } catch (err) {
      const errorResponse = err as { response?: { data?: { msg?: string } } };
      setError(errorResponse.response?.data?.msg || 'Failed to generate itinerary');
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
      setOutputMode('recommendations');
    } catch (err) {
      const errorResponse = err as { response?: { data?: { msg?: string } } };
      setError(errorResponse.response?.data?.msg || 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const formatCost = (cost: number | undefined | null) => {
    if (cost === undefined || cost === null) return null;
    return `$${cost.toFixed(2)}`;
  };

  const toggleRecommendation = (index: number) => {
    const newSelected = new Set(selectedRecommendations);
    if (newSelected.has(index)) {
      newSelected.delete(index);
      setStatusMessage({ index, message: 'Itinerary removed' });
    } else {
      newSelected.add(index);
      setStatusMessage({ index, message: 'Itinerary added' });
    }
    setSelectedRecommendations(newSelected);
    
    setTimeout(() => {
      setStatusMessage(null);
    }, 2000);
  };

  const handleNextToFlights = () => {
    if (selectedRecommendations.size === 0) {
      setError('Please select at least one recommendation');
      return;
    }

    if (!destination || !startDate || !endDate) {
      setError('Please fill in destination, start date, and end date');
      return;
    }

    const selectedRecs = Array.from(selectedRecommendations).map(idx => recommendations[idx]);
    
    localStorage.setItem('planit_ai_recommendations', JSON.stringify(selectedRecs));
    
    navigate('/itineraries/create', {
      state: {
        destination,
        departureDate: startDate,
        returnDate: endDate,
        recommendations: selectedRecs
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2 pb-2">
            AI Itinerary Generator
          </h1>
          <p className="text-muted-foreground text-lg">
            Let AI plan your perfect trip with personalized recommendations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Trip Details
              </CardTitle>
              <CardDescription>
                Enter your trip information to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g., Paris, France"
                  className="transition-all hover:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="transition-all hover:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="transition-all hover:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Budget (optional)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g., 2000"
                  className="transition-all hover:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-3 pt-2">
                <Button
                  onClick={generateItinerary}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                  size="lg"
                >
                  {loading && outputMode !== 'recommendations' ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2"></span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">✨</span>
                      Generate Itinerary
                    </>
                  )}
                </Button>

                <Button
                  onClick={getRecommendations}
                  disabled={loading}
                  variant="outline"
                  className="w-full border-2 border-primary/30 hover:border-primary hover:bg-primary/5 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                  size="lg"
                >
                  {loading && outputMode === 'recommendations' ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent mr-2"></span>
                      Loading...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">💡</span>
                      Get Recommendations
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 shadow-xl border-0 bg-white/80 backdrop-blur-sm min-h-[500px]">
            <CardHeader>
              <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                {outputMode === 'itinerary' && (
                  <>
                    <span>📅</span>
                    Generated Itinerary
                  </>
                )}
                {outputMode === 'recommendations' && (
                  <>
                    <span>💡</span>
                    AI Recommendations
                  </>
                )}
                {outputMode === 'none' && (
                  <>
                    <span>🎯</span>
                    Results
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {outputMode === 'itinerary' && itinerary?.destination && (
                  <span>Your personalized trip to {itinerary.destination}</span>
                )}
                {outputMode === 'recommendations' && (
                  <span>Personalized attractions for {destination}</span>
                )}
                {outputMode === 'none' && (
                  <span>Your AI-generated results will appear here</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {outputMode === 'none' && (
                <div className="flex flex-col items-center justify-center h-80 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center mb-4">
                    <span className="text-4xl">🗺️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Ready to Plan Your Trip?</h3>
                  <p className="text-muted-foreground max-w-md">
                    Enter your destination and dates, then click "Generate Itinerary" for a complete day-by-day plan, 
                    or "Get Recommendations" for personalized attraction suggestions.
                  </p>
                </div>
              )}

              {outputMode === 'itinerary' && itinerary && (
                <div className="space-y-4">
                  {itinerary.summary && (
                    <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-primary/10">
                      <p className="text-sm text-gray-700">{itinerary.summary}</p>
                    </div>
                  )}

                  {itinerary.estimated_budget && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium">Estimated Total Budget:</span>
                      <span className="text-green-600 font-semibold">${itinerary.estimated_budget.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {itinerary.days?.map((day, index) => (
                      <div 
                        key={index} 
                        className="border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                            {day.day}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-800">Day {day.day}</h3>
                            <p className="text-sm text-muted-foreground">{day.date}</p>
                          </div>
                        </div>
                        <div className="space-y-2 ml-13">
                          {day.activities?.map((activity, actIndex) => (
                            <div 
                              key={actIndex} 
                              className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-default"
                            >
                              <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded whitespace-nowrap">
                                {activity.time}
                              </span>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-800">{activity.activity}</p>
                                {activity.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
                                )}
                              </div>
                              {formatCost(activity.estimated_cost) && (
                                <span className="text-sm font-semibold text-green-600">
                                  {formatCost(activity.estimated_cost)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {itinerary.tips && itinerary.tips.length > 0 && (
                    <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
                      <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                        <span>💡</span> Travel Tips
                      </h4>
                      <ul className="space-y-1">
                        {itinerary.tips.map((tip, index) => (
                          <li key={index} className="text-sm text-amber-700 flex items-start gap-2">
                            <span className="text-amber-500">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {outputMode === 'recommendations' && recommendations.length > 0 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
                    {recommendations.map((rec, index) => {
                      const isSelected = selectedRecommendations.has(index);
                      const showMessage = statusMessage?.index === index;
                      return (
                        <div 
                          key={index} 
                          className="border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group relative"
                        >
                          {rec.image_url && (
                            <div className="relative h-40 overflow-hidden">
                              <img 
                                src={rec.image_url} 
                                alt={rec.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                              {rec.type && (
                                <span className="absolute top-2 right-2 text-xs bg-white/90 text-primary px-2 py-1 rounded-full font-medium">
                                  {rec.type}
                                </span>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRecommendation(index);
                                }}
                                className={`absolute bottom-2 right-2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                                  isSelected
                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                    : 'bg-white/90 hover:bg-white text-primary'
                                } shadow-lg hover:scale-110`}
                              >
                                {isSelected ? (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                )}
                              </button>
                              {showMessage && (
                                <div className="absolute bottom-12 right-2 bg-black/80 text-white text-xs px-3 py-1.5 rounded-md whitespace-nowrap transition-opacity duration-200">
                                  {statusMessage.message}
                                </div>
                              )}
                            </div>
                          )}
                          {!rec.image_url && (
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRecommendation(index);
                                }}
                                className={`absolute top-2 right-2 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                                  isSelected
                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                    : 'bg-white hover:bg-gray-100 text-primary border border-gray-300'
                                } shadow-lg hover:scale-110 z-10`}
                              >
                                {isSelected ? (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                )}
                              </button>
                              {showMessage && (
                                <div className="absolute top-12 right-2 bg-black/80 text-white text-xs px-3 py-1.5 rounded-md whitespace-nowrap transition-opacity duration-200 z-20">
                                  {statusMessage.message}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold text-gray-800 group-hover:text-primary transition-colors">
                                {rec.name}
                              </h3>
                              {!rec.image_url && rec.type && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                  {rec.type}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{rec.reasoning}</p>
                            <div className="flex flex-wrap gap-2 text-xs">
                              {rec.best_time && (
                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                                  <span>🕐</span> {rec.best_time}
                                </span>
                              )}
                              {rec.duration_minutes && (
                                <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-full flex items-center gap-1">
                                  <span>⏱️</span> {rec.duration_minutes} min
                                </span>
                              )}
                              {formatCost(rec.estimated_cost) && (
                                <span className="bg-green-50 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                                  <span>💵</span> {formatCost(rec.estimated_cost)}
                                </span>
                              )}
                            </div>
                            {rec.location && (
                              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                <span>📍</span> {rec.location}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {selectedRecommendations.size > 0 && (
                    <div className="mt-6 flex justify-center">
                      <Button
                        onClick={handleNextToFlights}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                        size="lg"
                      >
                        Next: Pick Flight
                      </Button>
                    </div>
                  )}
                </>
              )}

              {outputMode === 'recommendations' && recommendations.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center h-80 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <span className="text-3xl">🔍</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Recommendations Found</h3>
                  <p className="text-muted-foreground">Try a different destination or check your input.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
