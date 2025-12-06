import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

interface UserPreferences {
  gender?: string;
  age?: number;
  interests?: string[];
  travel_style?: string;
  budget_preference?: string;
  languages?: string[];
  bio?: string;
}

interface Match {
  user_id: number;
  name: string;
  email: string;
  compatibility_score: number;
  shared_interests?: string[];
  reasoning?: string;
  preferences?: UserPreferences;
}

const INTERESTS_OPTIONS = [
  'museums', 'photography', 'local cuisine', 'hiking', 'nightlife', 'sports',
  'beaches', 'adventure sports', 'art galleries', 'coffee shops', 'yoga',
  'sustainable travel', 'history', 'architecture', 'fine dining', 'street food',
  'markets', 'temples', 'music festivals', 'local culture'
];

const TRAVEL_STYLES = ['adventure', 'relaxed', 'cultural', 'luxury', 'budget'];
const BUDGET_PREFERENCES = ['budget', 'moderate', 'luxury'];
const GENDERS = ['male', 'female', 'non-binary', 'prefer not to say'];

export function Companions() {
  const navigate = useNavigate();
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [gender, setGender] = useState('');
  const [preferredGender, setPreferredGender] = useState('any');
  const [travelStyle, setTravelStyle] = useState('');
  const [budgetPreference, setBudgetPreference] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const findCompanions = async () => {
    if (!destination) {
      setError('Please enter a destination');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await api.post('/matching/find-companions', {
        destination,
        start_date: startDate,
        end_date: endDate,
        preferences: {
          gender,
          preferred_gender: preferredGender,
          travel_style: travelStyle,
          budget_preference: budgetPreference,
          interests: selectedInterests
        }
      });
      setMatches(response.data.matches || []);
      if (response.data.matches?.length === 0) {
        setError('No matches found. Try adjusting your preferences.');
      }
    } catch (err) {
      const errorResponse = err as { response?: { data?: { msg?: string } } };
      setError(errorResponse.response?.data?.msg || 'Failed to find companions');
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (userId: number, userName: string, compatibilityScore: number) => {
    setConnecting(userId);
    setError('');

    try {
      const convResponse = await api.post('/chat/conversations', {
        user_id: userId
      });
      
      const conversationId = convResponse.data.conversation_id;

      await api.post('/matching/0/connect', {
        user_id: userId,
        compatibility_score: compatibilityScore
      });

      setSuccessMessage(`Starting chat with ${userName}...`);
      
      setTimeout(() => {
        navigate(`/chat/${conversationId}`);
      }, 500);
    } catch (err) {
      const errorResponse = err as { response?: { data?: { msg?: string } } };
      setError(errorResponse.response?.data?.msg || 'Failed to start chat');
    } finally {
      setConnecting(null);
    }
  };

  useEffect(() => {
    api.get('/matching/matches')
      .then(() => {})
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Find Travel Companions
          </h1>
          <p className="text-muted-foreground text-lg">
            Connect with like-minded travelers for your next adventure
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Your Preferences
              </CardTitle>
              <CardDescription>
                Tell us about yourself to find the best matches
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="destination">Destination *</Label>
                <Input
                  id="destination"
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="gender">Your Gender</Label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="">Select...</option>
                    {GENDERS.map(g => (
                      <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredGender">Preferred Match</Label>
                  <select
                    id="preferredGender"
                    value={preferredGender}
                    onChange={(e) => setPreferredGender(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="any">Any</option>
                    {GENDERS.filter(g => g !== 'prefer not to say').map(g => (
                      <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="travelStyle">Travel Style</Label>
                <select
                  id="travelStyle"
                  value={travelStyle}
                  onChange={(e) => setTravelStyle(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Select...</option>
                  {TRAVEL_STYLES.map(style => (
                    <option key={style} value={style}>{style.charAt(0).toUpperCase() + style.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Budget Preference</Label>
                <select
                  id="budget"
                  value={budgetPreference}
                  onChange={(e) => setBudgetPreference(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Select...</option>
                  {BUDGET_PREFERENCES.map(budget => (
                    <option key={budget} value={budget}>{budget.charAt(0).toUpperCase() + budget.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Interests (select multiple)</Label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md bg-gray-50">
                  {INTERESTS_OPTIONS.map(interest => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`px-2 py-1 text-xs rounded-full transition-all ${
                        selectedInterests.includes(interest)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-400'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
                  {successMessage}
                </div>
              )}

              <Button
                onClick={findCompanions}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                size="lg"
              >
                {loading ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2"></span>
                    Finding Matches...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🔍</span>
                    Find Companions
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 shadow-xl border-0 bg-white/80 backdrop-blur-sm min-h-[600px]">
            <CardHeader>
              <CardTitle className="text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                <span>👥</span>
                {matches.length > 0 ? `${matches.length} Potential Companions` : 'Your Matches'}
              </CardTitle>
              <CardDescription>
                {matches.length > 0
                  ? 'AI-matched travelers based on your preferences'
                  : 'Enter your preferences and click "Find Companions" to see matches'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {matches.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center h-80 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center mb-4">
                    <span className="text-4xl">🌍</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Ready to Find Travel Buddies?</h3>
                  <p className="text-muted-foreground max-w-md">
                    Fill in your travel preferences and let our AI find compatible companions for your trip.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {matches.map((match) => (
                    <div
                      key={match.user_id}
                      className="border rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                            {match.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-gray-800">{match.name}</h3>
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                {match.compatibility_score}% match
                              </span>
                            </div>
                            
                            {match.preferences && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {match.preferences.gender && (
                                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                                    {match.preferences.gender}
                                  </span>
                                )}
                                {match.preferences.age && (
                                  <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                                    {match.preferences.age} years old
                                  </span>
                                )}
                                {match.preferences.travel_style && (
                                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
                                    {match.preferences.travel_style} traveler
                                  </span>
                                )}
                              </div>
                            )}

                            {match.shared_interests && match.shared_interests.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-500 mb-1">Shared interests:</p>
                                <div className="flex flex-wrap gap-1">
                                  {match.shared_interests.slice(0, 5).map((interest, idx) => (
                                    <span
                                      key={idx}
                                      className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full"
                                    >
                                      {interest}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {match.preferences?.bio && (
                              <p className="text-sm text-gray-600 mt-2 italic">
                                "{match.preferences.bio}"
                              </p>
                            )}

                            {match.reasoning && (
                              <p className="text-sm text-gray-500 mt-2">
                                <span className="font-medium">AI says:</span> {match.reasoning}
                              </p>
                            )}
                          </div>
                        </div>

                        <Button
                          onClick={() => startChat(match.user_id, match.name, match.compatibility_score)}
                          disabled={connecting === match.user_id}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                          size="sm"
                        >
                          {connecting === match.user_id ? (
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></span>
                          ) : (
                            <>
                              <span className="mr-1">💬</span>
                              Chat
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
