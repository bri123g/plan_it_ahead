"""
Wikivoyage integration using Wikimedia API for travel guides and tips
"""
import os
import requests
from typing import Optional, Dict, Any, List

WIKIMEDIA_API_BASE_URL = 'https://en.wikivoyage.org/w/api.php'


def get_destination_guide(destination: str) -> Optional[Dict[str, Any]]:
    """
    Get travel guide for a destination from Wikivoyage using Wikimedia API
    
    Args:
        destination: Destination name (city or country)
    
    Returns:
        Dictionary with guide content or None if not found
    """
    # Clean destination name for Wikipedia page title
    destination_clean = destination.replace(' ', '_')
    
    try:
        # First, get the page content using Wikimedia API
        params = {
            'action': 'query',
            'format': 'json',
            'titles': destination_clean,
            'prop': 'extracts|images|info',
            'exintro': False,
            'explaintext': True,
            'inprop': 'url'
        }
        
        response = requests.get(WIKIMEDIA_API_BASE_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        pages = data.get('query', {}).get('pages', {})
        if not pages:
            return None
        
        # Get first page (should be only one)
        page_id = list(pages.keys())[0]
        if page_id == '-1':  # Page not found
            return None
        
        page = pages[page_id]
        extract = page.get('extract', '')
        page_url = page.get('fullurl', f'https://en.wikivoyage.org/wiki/{destination_clean}')
        
        # Get images
        image_params = {
            'action': 'query',
            'format': 'json',
            'titles': destination_clean,
            'prop': 'images',
            'imlimit': 5
        }
        
        images = []
        try:
            img_response = requests.get(WIKIMEDIA_API_BASE_URL, params=image_params, timeout=10)
            img_response.raise_for_status()
            img_data = img_response.json()
            img_pages = img_data.get('query', {}).get('pages', {})
            for img_page_id, img_page in img_pages.items():
                if 'images' in img_page:
                    for img in img_page['images'][:5]:
                        img_title = img.get('title', '')
                        if img_title:
                            # Get image URL
                            img_url_params = {
                                'action': 'query',
                                'format': 'json',
                                'titles': img_title,
                                'prop': 'imageinfo',
                                'iiprop': 'url'
                            }
                            try:
                                img_url_response = requests.get(WIKIMEDIA_API_BASE_URL, params=img_url_params, timeout=10)
                                img_url_response.raise_for_status()
                                img_url_data = img_url_response.json()
                                img_url_pages = img_url_data.get('query', {}).get('pages', {})
                                for img_url_page in img_url_pages.values():
                                    if 'imageinfo' in img_url_page:
                                        images.append(img_url_page['imageinfo'][0].get('url', ''))
                            except:
                                pass
        except:
            pass
        
        # Parse sections from extract
        sections = {}
        current_section = 'Introduction'
        current_content = []
        
        lines = extract.split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith('==') and line.endswith('=='):
                # New section
                if current_section:
                    sections[current_section] = '\n'.join(current_content)
                current_section = line.strip('= ').strip()
                current_content = []
            elif line:
                current_content.append(line)
        
        if current_section:
            sections[current_section] = '\n'.join(current_content)
        
        return {
            'destination': destination,
            'url': page_url,
            'sections': sections,
            'images': images[:5],  # Limit to 5 images
            'summary': extract[:500] if extract else '',
            'full_text': extract
        }
    
    except requests.exceptions.RequestException as e:
        print(f"Error fetching Wikivoyage guide from Wikimedia API: {e}")
        return None
    except Exception as e:
        print(f"Error parsing Wikivoyage content: {e}")
        return None


def get_travel_tips(destination: str) -> Optional[Dict[str, Any]]:
    """
    Get travel tips for a destination from Wikivoyage
    
    Args:
        destination: Destination name
    
    Returns:
        Dictionary with tips or None if not found
    """
    guide = get_destination_guide(destination)
    if not guide:
        return None
    
    tips = {}
    
    # Look for specific sections that contain tips
    tip_sections = ['Stay safe', 'Cope', 'Go next', 'Understand', 'Get in', 'Get around', 'See', 'Do', 'Eat', 'Drink', 'Sleep']
    
    for section_name in tip_sections:
        for key, value in guide.get('sections', {}).items():
            if section_name.lower() in key.lower():
                tips[key] = value
    
    return {
        'destination': destination,
        'tips': tips,
        'url': guide.get('url')
    }


def search_destinations(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Search for destinations in Wikivoyage
    
    Args:
        query: Search query
        limit: Maximum number of results
    
    Returns:
        List of destination dictionaries
    """
    try:
        params = {
            'action': 'query',
            'format': 'json',
            'list': 'search',
            'srsearch': query,
            'srnamespace': 0,  # Main namespace
            'srlimit': limit
        }
        
        response = requests.get(WIKIMEDIA_API_BASE_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        results = []
        for item in data.get('query', {}).get('search', []):
            results.append({
                'title': item.get('title', ''),
                'snippet': item.get('snippet', ''),
                'url': f"https://en.wikivoyage.org/wiki/{item.get('title', '').replace(' ', '_')}"
            })
        
        return results
    except requests.exceptions.RequestException as e:
        print(f"Error searching Wikivoyage: {e}")
        return []
