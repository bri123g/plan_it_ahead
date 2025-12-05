"""
OpenAI integration for AI-driven itinerary generation and companion matching
"""
import os
import json
from typing import Dict, List, Any, Optional
from openai import OpenAI

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

if OPENAI_API_KEY:
    client = OpenAI(api_key=OPENAI_API_KEY)
else:
    client = None


def generate_itinerary(user_prefs: Dict[str, Any], destination: str, 
                      start_date: str, end_date: str, budget: Optional[float] = None) -> Dict[str, Any]:
    """
    Generate a personalized itinerary using AI
    
    Args:
        user_prefs: User preferences dictionary (interests, travel_style, etc.)
        destination: Destination name
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        budget: Optional budget constraint
    
    Returns:
        Dictionary with day-by-day itinerary
    """
    if not client:
        raise ValueError("OPENAI_API_KEY not set in environment variables")
    
    # Build prompt for itinerary generation
    interests = user_prefs.get('interests', [])
    travel_style = user_prefs.get('travel_style', 'moderate')
    dietary_restrictions = user_prefs.get('dietary_restrictions', [])
    
    prompt = f"""Generate a detailed day-by-day travel itinerary for {destination} from {start_date} to {end_date}.

User Preferences:
- Interests: {', '.join(interests) if interests else 'General travel'}
- Travel Style: {travel_style}
- Dietary Restrictions: {', '.join(dietary_restrictions) if dietary_restrictions else 'None'}
- Budget: ${budget if budget else 'Flexible'}

Requirements:
1. Create a day-by-day plan with specific times for each activity
2. Consider travel time between locations
3. Include estimated waiting times for popular attractions
4. Optimize the route to minimize travel time
5. Include meal recommendations
6. Balance activities (museums, outdoor activities, relaxation)
7. Consider opening hours and best visiting times

Return the response as a JSON object with this structure:
{{
    "destination": "{destination}",
    "start_date": "{start_date}",
    "end_date": "{end_date}",
    "total_days": <number>,
    "estimated_budget": <number>,
    "days": [
        {{
            "day": <number>,
            "date": "YYYY-MM-DD",
            "activities": [
                {{
                    "time": "HH:MM",
                    "activity": "<name>",
                    "type": "<attraction|restaurant|accommodation|transport>",
                    "location": "<address or coordinates>",
                    "duration_minutes": <number>,
                    "estimated_cost": <number>,
                    "description": "<brief description>",
                    "travel_time_from_previous": <minutes>,
                    "waiting_time": <minutes>
                }}
            ]
        }}
    ],
    "summary": "<overall trip summary>",
    "tips": ["<tip1>", "<tip2>", ...]
}}"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a travel planning expert. Generate detailed, practical, and optimized travel itineraries. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=3000
        )
        
        content = response.choices[0].message.content
        
        # Try to extract JSON from response
        try:
            # Remove markdown code blocks if present
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0]
            elif '```' in content:
                content = content.split('```')[1].split('```')[0]
            
            itinerary = json.loads(content)
            return itinerary
        except json.JSONDecodeError:
            # If JSON parsing fails, return a structured error response
            return {
                "error": "Failed to parse AI response",
                "raw_response": content,
                "destination": destination,
                "start_date": start_date,
                "end_date": end_date
            }
    
    except Exception as e:
        print(f"Error generating itinerary with OpenAI: {e}")
        raise


def recommend_attractions(user_prefs: Dict[str, Any], destination: str, 
                         current_itinerary: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """
    Get AI recommendations for attractions based on user preferences
    
    Args:
        user_prefs: User preferences dictionary
        destination: Destination name
        current_itinerary: Optional current itinerary to avoid duplicates
    
    Returns:
        List of recommended attractions with reasoning
    """
    if not client:
        raise ValueError("OPENAI_API_KEY not set in environment variables")
    
    interests = user_prefs.get('interests', [])
    travel_style = user_prefs.get('travel_style', 'moderate')
    
    current_activities = []
    if current_itinerary:
        for day in current_itinerary:
            if isinstance(day, dict) and 'activities' in day:
                current_activities.extend([a.get('activity', '') for a in day['activities']])
    
    prompt = f"""Recommend 5-10 attractions or activities for {destination} based on these preferences:

User Interests: {', '.join(interests) if interests else 'General travel'}
Travel Style: {travel_style}

Current itinerary activities (avoid duplicates): {', '.join(current_activities) if current_activities else 'None'}

For each recommendation, provide:
- Name
- Type (museum, park, restaurant, landmark, etc.)
- Why it matches the user's interests
- Best time to visit
- Estimated duration
- Estimated cost

Return as JSON array:
[
    {{
        "name": "<attraction name>",
        "type": "<type>",
        "reasoning": "<why this matches user preferences>",
        "best_time": "<best time to visit>",
        "duration_minutes": <number>,
        "estimated_cost": <number>,
        "location": "<general location>"
    }}
]"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a travel recommendation expert. Provide personalized attraction recommendations. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        content = response.choices[0].message.content
        
        try:
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0]
            elif '```' in content:
                content = content.split('```')[1].split('```')[0]
            
            recommendations = json.loads(content)
            return recommendations if isinstance(recommendations, list) else []
        except json.JSONDecodeError:
            return []
    
    except Exception as e:
        print(f"Error getting recommendations from OpenAI: {e}")
        return []


def match_companions(user_id: int, user_prefs: Dict[str, Any], 
                    trip_details: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Use AI to analyze and match users with similar travel interests
    
    Args:
        user_id: Current user ID
        user_prefs: Current user preferences
        trip_details: Trip details (destination, dates, etc.)
    
    Returns:
        List of potential matches with compatibility scores and reasoning
    """
    if not client:
        raise ValueError("OPENAI_API_KEY not set in environment variables")
    
    # This function will be called with candidate users from the database
    # For now, it provides a framework for AI-based matching analysis
    
    prompt = f"""Analyze travel compatibility between two users planning trips.

User 1 Preferences:
- Interests: {', '.join(user_prefs.get('interests', []))}
- Travel Style: {user_prefs.get('travel_style', 'moderate')}
- Destination: {trip_details.get('destination', 'Unknown')}
- Dates: {trip_details.get('start_date', '')} to {trip_details.get('end_date', '')}

Provide a compatibility analysis that considers:
1. Shared interests
2. Travel style compatibility
3. Destination overlap
4. Date overlap
5. Overall compatibility score (0-100)

Return JSON:
{{
    "compatibility_score": <0-100>,
    "shared_interests": ["<interest1>", ...],
    "travel_style_match": "<description>",
    "destination_overlap": <boolean>,
    "date_overlap": <boolean>,
    "reasoning": "<explanation of compatibility>"
}}"""
    
    # Note: This is a template function. Actual implementation will compare
    # current user with candidate users from database
    return []


def analyze_user_compatibility(user1_prefs: Dict[str, Any], user1_trip: Dict[str, Any],
                               user2_prefs: Dict[str, Any], user2_trip: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze compatibility between two specific users
    
    Args:
        user1_prefs: First user preferences
        user1_trip: First user trip details
        user2_prefs: Second user preferences
        user2_trip: Second user trip details
    
    Returns:
        Compatibility analysis dictionary
    """
    if not client:
        raise ValueError("OPENAI_API_KEY not set in environment variables")
    
    prompt = f"""Analyze travel compatibility between two users:

User 1:
- Interests: {', '.join(user1_prefs.get('interests', []))}
- Travel Style: {user1_prefs.get('travel_style', 'moderate')}
- Destination: {user1_trip.get('destination', 'Unknown')}
- Dates: {user1_trip.get('start_date', '')} to {user1_trip.get('end_date', '')}

User 2:
- Interests: {', '.join(user2_prefs.get('interests', []))}
- Travel Style: {user2_prefs.get('travel_style', 'moderate')}
- Destination: {user2_trip.get('destination', 'Unknown')}
- Dates: {user2_trip.get('start_date', '')} to {user2_trip.get('end_date', '')}

Provide compatibility analysis. Return JSON:
{{
    "compatibility_score": <0-100>,
    "shared_interests": ["<interest1>", ...],
    "travel_style_match": "<description>",
    "destination_overlap": <boolean>,
    "date_overlap": <boolean>,
    "reasoning": "<explanation>"
}}"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a travel compatibility analyst. Analyze how well two travelers would match. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=1000
        )
        
        content = response.choices[0].message.content
        
        try:
            if '```json' in content:
                content = content.split('```json')[1].split('```')[0]
            elif '```' in content:
                content = content.split('```')[1].split('```')[0]
            
            return json.loads(content)
        except json.JSONDecodeError:
            return {
                "compatibility_score": 0,
                "error": "Failed to parse AI response"
            }
    
    except Exception as e:
        print(f"Error analyzing compatibility with OpenAI: {e}")
        return {
            "compatibility_score": 0,
            "error": str(e)
        }

