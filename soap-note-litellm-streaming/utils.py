import os
import json
import boto3
import logging
from urllib.parse import urlparse
from typing import Dict, Any, Optional

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def read_file(filepath: str) -> str:
    """
    Read content from a file
    
    Args:
        filepath: Path to the file
        
    Returns:
        File content as string or empty string if error
    """
    try:
        if not os.path.exists(filepath):
            logger.warning(f"File not found: {filepath}")
            return ""
            
        with open(filepath, 'r') as file:
            return file.read()
    except Exception as e:
        logger.error(f"Error reading file {filepath}: {str(e)}")
        return ""

def format_patient_info(patient_data: Dict[str, Any]) -> str:
    """
    Format patient data into a readable string
    
    Args:
        patient_data: Dictionary containing patient information
        
    Returns:
        Formatted patient information string
    """
    return f"""
    Patient Information:
    Name: {patient_data.get('firstname', '')} {patient_data.get('middlename', '')} {patient_data.get('lastname', '')}
    Gender: {patient_data.get('gender', '')}
    Date of Birth: {patient_data.get('dob', '')}
    Weight: {patient_data.get('weight', '')}
    Height: {patient_data.get('height_feet', '')}' {patient_data.get('height_inch', '')}"
    Past Medical History: {patient_data.get('past_medical_history', '')}
    Past Surgery History: {patient_data.get('past_surgery_history', '')}
    """

def parse_event(event: Any) -> Dict[str, Any]:
    """
    Parse the Lambda event to extract the request body
    
    Args:
        event: Lambda event object
        
    Returns:
        Dictionary containing the parsed body
    """
    try:
        if isinstance(event, dict):
            if 'body' in event:
                # Handle API Gateway format
                return json.loads(event['body']) if isinstance(event['body'], str) else event['body']
            else:
                # Direct invocation
                return event
        elif isinstance(event, str):
            # Handle string input
            return json.loads(event)
        else:
            logger.error(f"Unsupported event type: {type(event)}")
            return {}
    except Exception as e:
        logger.error(f"Error parsing event: {str(e)}")
        return {}
    




def download_transcript_to_tmp(transcript_s3_uri: str) -> str:
    s3_client = boto3.client('s3')
    parsed_uri = urlparse(transcript_s3_uri)
    bucket = parsed_uri.netloc
    key = parsed_uri.path.lstrip('/')
    local_file_path = f"/tmp/{os.path.basename(key)}"
    s3_client.download_file(bucket, key, local_file_path)
    return local_file_path

def read_transcript_from_local(local_file_path: str) -> str:
    with open(local_file_path, 'r', encoding='utf-8') as f:
        return f.read()