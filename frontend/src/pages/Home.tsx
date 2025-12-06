import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuthHook';
import { Button } from '../components/ui/button';

export function Home() {
  const { user } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="relative container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Plan It Ahead</h1>
          <p className="text-lg text-gray-700">Your AI-powered travel planning companion</p>
        </div>

        <div className="flex items-center justify-center mb-20">
          <div className="w-full flex items-center justify-center">
            {user ? (
              <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <Link to="/itineraries/create" className="w-full md:w-auto">
                  <Button size="lg" className="px-14 py-5 text-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg">Start Planning</Button>
                </Link>
                <Link to="/ai" className="w-full md:w-auto">
                  <Button
                    size="lg"
                    className="px-14 py-5 text-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                  >
                    AI Itinerary Generator
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <Link to="/register" className="w-full md:w-auto">
                  <Button size="lg" className="px-14 py-5 text-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg">Get Started</Button>
                </Link>
                <Link to="/login" className="w-full md:w-auto">
                  <Button
                    size="lg"
                    className="px-14 py-5 text-2xl bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 shadow-md"
                  >
                    Login
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Feature sections with alternating image layout */}
        <div className="space-y-16 max-w-6xl mx-auto">
          {/* AI-Powered Planning - Image on Left */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="rounded-2xl overflow-hidden shadow-2xl h-80">
              <img 
                src="/images/image.png" 
                alt="Travel destination"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-4 text-blue-600">AI-Powered Planning</h2>
              <p className="text-gray-700 text-lg leading-relaxed">
                Personalized itineraries optimized for your preferences, budget, and time. 
                Let our AI create the perfect travel plan tailored just for you.
              </p>
            </div>
          </div>

          {/* Find Companions - Image on Right */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-8 order-2 md:order-1">
              <h2 className="text-3xl font-bold mb-4 text-blue-600">Find Companions</h2>
              <p className="text-gray-700 text-lg leading-relaxed">
                Connect with travelers planning similar trips and share your journey. 
                Meet new friends who share your passion for adventure.
              </p>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-2xl h-80 order-1 md:order-2">
              <img 
                src="/images/travel-world.jpeg" 
                alt="Travel companions"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

          {/* All-in-One Platform - Image on Left */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="rounded-2xl overflow-hidden shadow-2xl h-80">
              <img 
                src="/images/Image3.jfif" 
                alt="Adventure travel"
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-8">
              <h2 className="text-3xl font-bold mb-4 text-blue-600">All-in-One Platform</h2>
              <p className="text-gray-700 text-lg leading-relaxed">
                Search destinations, attractions, hotels, and flights in one place. 
                Everything you need for the perfect trip, right at your fingertips.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


