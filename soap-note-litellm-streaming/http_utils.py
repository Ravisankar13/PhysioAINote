import json
import decimal
from urllib.parse import parse_qs
from datetime import datetime

# Custom JSON encoder to handle Decimal types and format timestamps
class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            # Convert decimal to float for JSON serialization
            return float(obj)
        # Let the base class default method handle other types
        return super(CustomEncoder, self).default(obj)

def parse_body(event):
    """
    Parse and return the body from an API Gateway event
    Args:
        event (dict): The API Gateway event
    Returns:
        dict: The parsed body
    """
    if 'body' not in event:
        return {}
    body = event['body']
    # Handle both string and dict formats
    if isinstance(body, str):
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            # Try parsing as form data if it's not JSON
            return {k: v[0] for k, v in parse_qs(body).items()}
    return body

def format_timestamps(data):
    """
    Recursively convert timestamp values in created_at fields to human-readable format
    """
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if key == 'created_at' and (isinstance(value, int) or isinstance(value, float)):
                # Convert timestamp to human-readable date
                result[key] = datetime.fromtimestamp(value).strftime('%Y-%m-%d %H:%M:%S')
            elif isinstance(value, dict) or isinstance(value, list):
                result[key] = format_timestamps(value)
            else:
                result[key] = value
        return result
    elif isinstance(data, list):
        return [format_timestamps(item) for item in data]
    else:
        return data

def create_response(status_code, body):
    """
    Create a standardized API Gateway response
    Args:
        status_code (int): HTTP status code
        body (dict): Response body
    Returns:
        dict: Formatted API Gateway response
    """
    # Format timestamps in the response
    formatted_body = format_timestamps(body)
    
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        },
        'body': json.dumps(formatted_body, cls=CustomEncoder)
    }