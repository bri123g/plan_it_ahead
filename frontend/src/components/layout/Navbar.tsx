import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuthHook';
import { Button } from '../ui/button';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Plan It Ahead
        </Link>
        
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link 
                to="/itineraries" 
                className={`text-sm font-medium transition-colors ${
                  isActive('/itineraries') 
                    ? 'text-blue-600' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                My Itineraries
              </Link>
              <Link 
                to="/ai" 
                className={`text-sm font-medium transition-colors ${
                  isActive('/ai') 
                    ? 'text-blue-600' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                AI Planner
              </Link>
              <Link 
                to="/companions" 
                className={`text-sm font-medium transition-colors ${
                  isActive('/companions') 
                    ? 'text-blue-600' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Companions
              </Link>
              <Link 
                to="/chat" 
                className={`text-sm font-medium transition-colors ${
                  isActive('/chat') 
                    ? 'text-blue-600' 
                    : 'text-gray-700 hover:text-blue-600'
                }`}
              >
                Chat
              </Link>
              <span className="text-sm text-gray-600">{user.name}</span>
              <Button variant="outline" size="sm" onClick={handleLogout} className="border-blue-600 text-blue-600 hover:bg-blue-50">
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

