import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';

export function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">Plan It Ahead</h1>
          <p className="text-xl text-gray-600 mb-8">
            Your AI-powered travel planning companion
          </p>
          
          {user ? (
            <div className="flex gap-4 justify-center">
              <Link to="/search">
                <Button size="lg">Start Planning</Button>
              </Link>
              <Link to="/ai">
                <Button size="lg" variant="outline">AI Itinerary Generator</Button>
              </Link>
            </div>
          ) : (
            <div className="flex gap-4 justify-center">
              <Link to="/register">
                <Button size="lg">Get Started</Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline">Login</Button>
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="text-center p-6">
            <h2 className="text-2xl font-semibold mb-2">AI-Powered Planning</h2>
            <p className="text-gray-600">
              Get personalized itineraries optimized for your preferences, budget, and time
            </p>
          </div>
          
          <div className="text-center p-6">
            <h2 className="text-2xl font-semibold mb-2">Find Companions</h2>
            <p className="text-gray-600">
              Connect with travelers planning similar trips and share your journey
            </p>
          </div>
          
          <div className="text-center p-6">
            <h2 className="text-2xl font-semibold mb-2">All-in-One Platform</h2>
            <p className="text-gray-600">
              Search destinations, attractions, hotels, and flights in one place
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

