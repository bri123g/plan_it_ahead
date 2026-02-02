# Plan It Ahead - Full Stack Application

**Description:** AI-powered itinerary planner with a React (TypeScript + Vite) frontend and Flask backend. Generates personalized travel plans and stores user preferences in a database.  

**Tech Stack:** React, TypeScript, Vite, Flask, Python, SQLite  

**Features:**
- Personalized AI-generated travel itineraries
- Stores user preferences and travel data
- Full-stack React + Flask application  

## Project Structure

```
plan_it_ahead/
├── frontend/          # React + TypeScript + Vite frontend
│   ├── src/          # Source code
│   ├── public/       # Static assets
│   └── package.json  # Frontend dependencies
├── backend/          # Flask Python backend
│   ├── app.py       # Main Flask application
│   └── requirements.txt  # Python dependencies
└── README.md        # This file
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Python 3.8 or higher
- npm or yarn

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` (default Vite port).

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
   - **Windows**: `venv\Scripts\activate`
   - **Linux/Mac**: `source venv/bin/activate`

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Create a `.env` file (copy from `.env.example` if available):
```bash
# Create .env file with:
FLASK_DEBUG=True
PORT=5000
SECRET_KEY=your-secret-key-here
```

6. Run the Flask server:
```bash
python app.py
```

The backend API will be available at `http://localhost:5000`.

## Development

### Running Both Servers

You'll need to run both the frontend and backend servers simultaneously:

1. **Terminal 1** - Frontend:
```bash
cd frontend
npm run dev
```

2. **Terminal 2** - Backend:
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python app.py
```

### API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/test` - Test endpoint

## Building for Production

### Frontend

```bash
cd frontend
npm run build
```

The production build will be in `frontend/dist/`.

### Backend

Ensure your `.env` file has production settings:
- `FLASK_DEBUG=False`
- `SECRET_KEY` set to a secure random string

## Environment Variables

### Frontend
Create `frontend/.env` for frontend-specific environment variables (e.g., API URLs).

### Backend
Create `backend/.env` with:
- `FLASK_DEBUG` - Set to `False` in production
- `PORT` - Server port (default: 5000)
- `SECRET_KEY` - Secret key for Flask sessions

## License

This project is part of a database assignment.
