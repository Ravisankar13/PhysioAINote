import json
import logging
import boto3
import os
import uuid
from typing import Dict, Any
from db_utils import session_data_db
from soap_generator import SOAPGenerator
from http_utils import parse_body
from utils import parse_event, read_transcript_from_local, download_transcript_to_tmp

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize Lambda client for self-invocation
lambda_client = boto3.client('lambda')

# Configure LiteLLM models
ltlm_config = {
    "primary_model": "gpt-4o",
    "fallback_models": [],
    "model_configs": {
        "gpt-4o": {"max_tokens": 5000, "temperature": 0.1},
    }
}

# Define SOAP note sections
SOAP_SECTIONS = [
    "subjective",
    "objective",
    "assessment",
    "plan",
    "goals",
    "treatment"
]


def lambda_handler(event, context):
    """
    Main Lambda handler function - routes requests based on path and method
    """
    logger.info(f"Received event: {json.dumps(event)}")
    
    # Check if this is an asynchronous processing call (directly invoked Lambda)
    if isinstance(event, dict) and event.get('async_processing') is True:
        # This is an async call - event is just the payload
        return process_soap_generation(event)
    
    # Otherwise, this is an API Gateway event
    path = event.get('path', '')
    http_method = event.get('httpMethod', '')
    payload = parse_body(event)
    
    try:
        # Handle demographic data saving endpoint
        if path == '/save-demographic-data' and http_method == 'POST':
            status, message = handle_save_demographic_data(payload)
            return {
                'statusCode': 201 if status else 500,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'message': message
                })
            }
        
        # Handle SOAP note generation endpoint
        elif path == '/gen-soap-note' and http_method == 'POST':
            # Initial call - just initiate async processing and return immediately
            return initiate_async_processing(event, context)
        
        # Handle unknown endpoint
        else:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'error': f"Unknown endpoint: {path} with method {http_method}"
                })
            }
            
    except Exception as e:
        logger.error(f"Error in lambda_handler: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({"error": f"Error processing request: {str(e)}"})
        }


def initiate_async_processing(event, context):
    """
    Invoke Lambda asynchronously to generate SOAP note
    """
    try:
        # Extract the request body
        payload = parse_body(event)
        
        # Get user information from the authorizer context
        request_context = event.get('requestContext', {})
        authorizer = request_context.get('authorizer', {})
        user_id = authorizer.get('uuid')
        username = authorizer.get('username')
        
        # Extract required parameters
        session_id = payload.get('session_id')
        transcript_s3_uri = payload.get('transcript_s3_uri')
        
        if not session_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'session_id is required'})
            }
        
        logger.info(f"Initiating async SOAP note generation for session: {session_id}")
        
        # Prepare payload for async invocation - this becomes the event in the async call
        async_payload = {
            'async_processing': True,
            'session_id': session_id,
            'transcript_s3_uri': transcript_s3_uri,
            'user_id': user_id,
            'username': username
        }
        
        # Invoke Lambda asynchronously
        response = lambda_client.invoke(
            FunctionName=context.function_name,
            InvocationType='Event',  # Async invocation
            Payload=json.dumps(async_payload)
        )
        
        logger.info(f"Async Lambda invoked with status code: {response['StatusCode']}")
        
        # Return immediate response to client
        return {
            'statusCode': 202,  # 202 Accepted
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'message': 'SOAP note generation started asynchronously',
                'session_id': session_id
            })
        }
    except Exception as e:
        logger.error(f"Error initiating async processing: {str(e)}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'error': f"Error initiating SOAP note generation: {str(e)}"
            })
        }


def handle_save_demographic_data(payload):
    """
    Save patient demographic data to DynamoDB
    """
    try:
        logger.info("Saving Patient Demographic data ...")
        # Extract session_id and user_id from payload
        session_id = payload.get('session_id')
        user_id = payload.get('user_id')
        
        # Filter out None or empty values from payload to avoid overwriting with None
        filtered_payload = {k: v for k, v in payload.items() if v is not None and v != ""}
        
        if not session_id:
            # Create a new session
            session_name = f"{filtered_payload.get('firstname', '')} {filtered_payload.get('lastname', '')}"
            filtered_payload["session_name"] = session_name
            session_id = session_data_db.save_item(filtered_payload)
            logger.info(f"Created new session record with ID: {session_id}")
        else:
            # Update existing session - ensure we have the primary key set correctly
            filtered_payload['pk'] = session_id
            
            # Call save_item with the filtered payload to update only provided fields
            session_data_db.save_item(filtered_payload)
            logger.info(f"Updated existing session record with ID: {session_id}")
            
        return True, "Data saved successfully"
    except Exception as e:
        logger.error(f"Error saving patient demographic data: {str(e)}", exc_info=True)
        return False, f"Error saving patient demographic data: {str(e)}"


def process_soap_generation(payload):
    """
    Process the SOAP note generation - includes DynamoDB initialization
    """
    try:
        logger.info("Starting background SOAP note generation process...")
        
        # Extract information from payload (sent during async invocation)
        user_id = payload.get('user_id')
        username = payload.get('username')
        session_id = payload.get('session_id')
        
        if not session_id:
            raise ValueError("session_id is required for SOAP note generation")
            
        if not user_id:
            raise ValueError("user_id is required for SOAP note generation")
        
        # Initialize SOAP note status in DB
        soap_note = {"status": "in_progress"}
        session_data_db.update_field_composite(session_id, user_id, "soap_note", soap_note)
        
        # Download and process transcript if available
        transcript_s3_uri = payload.get("transcript_s3_uri")
        transcript_content = ""
        if transcript_s3_uri:
            local_transcript_path = download_transcript_to_tmp(transcript_s3_uri)
            transcript_content = read_transcript_from_local(local_transcript_path)
            logger.info(f"Transcript downloaded and processed from {transcript_s3_uri}")
        
        # Initialize SOAP generator
        soap_generator = SOAPGenerator(
            ltlm_config["primary_model"],
            ltlm_config["fallback_models"],
            ltlm_config["model_configs"],
            transcript_content
        )
        
        # Add transcript to payload
        payload["transcript_content"] = transcript_content
        
        # Process each SOAP section
        for index, section in enumerate(SOAP_SECTIONS, start=1):
            logger.info(f"Generating {section} section...")
            
            # Generate section
            soap_note = soap_generator.process_soap_section(section, soap_note, payload)
            
            # Update status if all sections completed
            if index == len(SOAP_SECTIONS):
                soap_note["status"] = "completed"
                
            # Update DynamoDB after each section
            session_data_db.update_field_composite(session_id, user_id, "soap_note", soap_note)
            logger.info(f"Updated {section} section in DynamoDB")
        
        logger.info(f"SOAP note generation completed for session ID: {session_id}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'SOAP note generation completed',
                'session_id': session_id,
                'user_id': user_id,
                'status': 'completed'
            })
        }
    except Exception as e:
        logger.error(f"Error in background SOAP generation: {str(e)}", exc_info=True)
        
        # Try to update the note with error status if we have session_id
        try:
            if 'session_id' in locals() and 'user_id' in locals() and session_id and user_id:
                error_note = {"status": "error", "error_message": str(e)}
                session_data_db.update_field_composite(session_id, user_id, "soap_note", error_note)
        except Exception as update_error:
            logger.error(f"Failed to update error status: {str(update_error)}")
            
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': f'Background SOAP generation error: {str(e)}'
            })
        }