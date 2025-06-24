import json
import logging
import asyncio
import concurrent.futures
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager

from soap_generator import SOAPGenerator
from utils import format_patient_info, read_file, download_transcript_to_tmp, read_transcript_from_local
from db_utils import DynamoDBManager

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize database manager (you may need to adjust table name)
try:
    session_data_db = DynamoDBManager('physio-convo-session-data')
except Exception as e:
    logger.warning(f"Could not initialize DynamoDB: {e}")
    session_data_db = None

# Configure LiteLLM models
LTLM_CONFIG = {
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    logger.info("Starting SOAP Note Generator API")
    yield
    # Shutdown
    logger.info("Shutting down SOAP Note Generator API")

# Initialize FastAPI app
app = FastAPI(
    title="SOAP Note Generator API",
    description="API for generating SOAP notes from patient transcripts using LiteLLM",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class PatientDemographicData(BaseModel):
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    firstname: Optional[str] = None
    middlename: Optional[str] = None
    lastname: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    weight: Optional[str] = None
    height_feet: Optional[str] = None
    height_inch: Optional[str] = None
    pastMedicalHistory: Optional[str] = None  # Changed to match original payload
    pastSurgicalHistory: Optional[str] = None  # Changed to match original payload

class SOAPGenerationRequest(BaseModel):
    session_id: str = Field(..., description="Session ID for the patient")
    transcript_s3_uri: Optional[str] = Field(None, description="S3 URI of the transcript file")
    user_id: Optional[str] = Field(None, description="User ID")
    # Include patient data fields directly in the request (matching original payload structure)
    firstname: Optional[str] = None
    middlename: Optional[str] = None
    lastname: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    weight: Optional[str] = None
    height_feet: Optional[str] = None
    height_inch: Optional[str] = None
    pastMedicalHistory: Optional[str] = None
    pastSurgicalHistory: Optional[str] = None

class SOAPGenerationResponse(BaseModel):
    message: str
    session_id: str
    status: str
    soap_note: Optional[Dict[str, Any]] = None

class DemographicResponse(BaseModel):
    message: str
    session_id: Optional[str] = None

# Helper functions
def create_error_response(status_code: int, message: str) -> JSONResponse:
    """Create standardized error response"""
    return JSONResponse(
        status_code=status_code,
        content={"error": message}
    )

async def process_soap_generation_async(
    session_id: str,
    transcript_s3_uri: Optional[str] = None,
    user_id: Optional[str] = None,
    patient_data: Optional[Dict[str, Any]] = None
):
    """Background task to process SOAP note generation"""
    try:
        logger.info(f"Starting SOAP note generation for session: {session_id}")
        
        if not patient_data:
            patient_data = {}
            
        # Initialize SOAP note status in DB if available
        if session_data_db and user_id:
            soap_note = {"status": "in_progress"}
            session_data_db.update_field_composite(session_id, user_id, "soap_note", soap_note)
        
        # Download and process transcript if available
        transcript_content = ""
        if transcript_s3_uri:
            local_transcript_path = download_transcript_to_tmp(transcript_s3_uri)
            transcript_content = read_transcript_from_local(local_transcript_path)
            logger.info(f"Transcript downloaded and processed from {transcript_s3_uri}")
        
        # Initialize SOAP generator
        soap_generator = SOAPGenerator(
            LTLM_CONFIG["primary_model"],
            LTLM_CONFIG["fallback_models"],
            LTLM_CONFIG["model_configs"],
            transcript_content
        )
        
        # Process each SOAP section
        soap_note = {"status": "in_progress"}
        for index, section in enumerate(SOAP_SECTIONS, start=1):
            logger.info(f"Generating {section} section...")
            
            # Generate section
            soap_note = soap_generator.process_soap_section(section, soap_note, patient_data)
            
            # Update status if all sections completed
            if index == len(SOAP_SECTIONS):
                soap_note["status"] = "completed"
                
            # Update database after each section if available
            if session_data_db and user_id:
                session_data_db.update_field_composite(session_id, user_id, "soap_note", soap_note)
                logger.info(f"Updated {section} section in database")
        
        logger.info(f"SOAP note generation completed for session ID: {session_id}")
        
    except Exception as e:
        logger.error(f"Error in background SOAP generation: {str(e)}", exc_info=True)
        
        # Try to update the note with error status if we have session_id and user_id
        if session_data_db and session_id and user_id:
            try:
                error_note = {"status": "error", "error_message": str(e)}
                session_data_db.update_field_composite(session_id, user_id, "soap_note", error_note)
            except Exception as update_error:
                logger.error(f"Failed to update error status: {str(update_error)}")

# API Endpoints
@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "SOAP Note Generator API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "soap-note-generator"}

@app.get("/test-stream")
async def test_stream():
    """Test streaming endpoint to verify streaming works"""
    async def generate_test_stream():
        for i in range(10):
            data = {
                'type': 'test',
                'message': f'Test message {i+1}',
                'timestamp': f'{i+1}/10'
            }
            yield f"data: {json.dumps(data)}\n\n"
            await asyncio.sleep(1)  # 1 second delay between messages
        
        yield f"data: {json.dumps({'type': 'complete', 'message': 'Test completed!'})}\n\n"
    
    return StreamingResponse(
        generate_test_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "X-Accel-Buffering": "no",
        }
    )

@app.post("/save-demographic-data", response_model=DemographicResponse)
async def save_demographic_data(data: PatientDemographicData):
    """Save patient demographic data"""
    try:
        logger.info("Saving Patient Demographic data...")
        
        # Convert to dict and filter out None values
        payload = data.model_dump(exclude_none=True)
        
        if not session_data_db:
            raise HTTPException(status_code=503, detail="Database service unavailable")
        
        session_id = payload.get('session_id')
        user_id = payload.get('user_id')
        
        if not session_id:
            # Create a new session
            session_name = f"{payload.get('firstname', '')} {payload.get('lastname', '')}"
            payload["session_name"] = session_name
            session_id = session_data_db.save_item(payload)
            logger.info(f"Created new session record with ID: {session_id}")
        else:
            # Update existing session
            payload['pk'] = session_id
            session_data_db.save_item(payload)
            logger.info(f"Updated existing session record with ID: {session_id}")
            
        return DemographicResponse(
            message="Data saved successfully",
            session_id=session_id
        )
        
    except Exception as e:
        logger.error(f"Error saving patient demographic data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error saving patient demographic data: {str(e)}")

@app.post("/gen-soap-note", response_model=SOAPGenerationResponse)
async def generate_soap_note(
    request: SOAPGenerationRequest,
    background_tasks: BackgroundTasks
):
    """Generate SOAP note asynchronously"""
    try:
        session_id = request.session_id
        transcript_s3_uri = request.transcript_s3_uri
        user_id = request.user_id
        
        # Extract patient data from request (matching original payload structure)
        patient_data = {
            "firstname": request.firstname,
            "middlename": request.middlename,
            "lastname": request.lastname,
            "gender": request.gender,
            "dob": request.dob,
            "weight": request.weight,
            "height_feet": request.height_feet,
            "height_inch": request.height_inch,
            "past_medical_history": request.pastMedicalHistory,
            "past_surgery_history": request.pastSurgicalHistory,
        }
        
        if not transcript_s3_uri:
            raise HTTPException(status_code=400, detail="transcript_s3_uri is required")
        
        logger.info(f"Initiating SOAP note generation for session: {session_id}")
        
        # Add background task for SOAP generation
        background_tasks.add_task(
            process_soap_generation_async,
            session_id,
            transcript_s3_uri,
            user_id,
            patient_data
        )
        
        # Return immediate response (matching original Lambda response)
        return SOAPGenerationResponse(
            message="SOAP note generation started asynchronously",
            session_id=session_id,
            status="in_progress"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating SOAP note generation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error initiating SOAP note generation: {str(e)}")

@app.post("/gen-soap-note-sync", response_model=SOAPGenerationResponse)
async def generate_soap_note_sync(request: SOAPGenerationRequest):
    """Generate SOAP note synchronously"""
    try:
        session_id = request.session_id
        transcript_s3_uri = request.transcript_s3_uri
        user_id = request.user_id
        
        # Extract patient data from request (matching original payload structure)
        patient_data = {
            "firstname": request.firstname,
            "middlename": request.middlename,
            "lastname": request.lastname,
            "gender": request.gender,
            "dob": request.dob,
            "weight": request.weight,
            "height_feet": request.height_feet,
            "height_inch": request.height_inch,
            "past_medical_history": request.pastMedicalHistory,
            "past_surgery_history": request.pastSurgicalHistory,
        }
        
        if not transcript_s3_uri:
            raise HTTPException(status_code=400, detail="transcript_s3_uri is required")
        
        logger.info(f"Starting synchronous SOAP note generation for session: {session_id}")
        
        # Download and process transcript
        local_transcript_path = download_transcript_to_tmp(transcript_s3_uri)
        transcript_content = read_transcript_from_local(local_transcript_path)
        logger.info(f"Transcript downloaded and processed from {transcript_s3_uri}")
        
        # Initialize SOAP generator
        soap_generator = SOAPGenerator(
            LTLM_CONFIG["primary_model"],
            LTLM_CONFIG["fallback_models"],
            LTLM_CONFIG["model_configs"],
            transcript_content
        )
        
        # Process each SOAP section
        soap_note = {"status": "in_progress"}
        for index, section in enumerate(SOAP_SECTIONS, start=1):
            logger.info(f"Generating {section} section...")
            
            # Generate section
            soap_note = soap_generator.process_soap_section(section, soap_note, patient_data)
            
            # Update status if all sections completed
            if index == len(SOAP_SECTIONS):
                soap_note["status"] = "completed"
        
        logger.info(f"SOAP note generation completed for session ID: {session_id}")
        
        return SOAPGenerationResponse(
            message="SOAP note generation completed",
            session_id=session_id,
            status="completed",
            soap_note=soap_note
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in synchronous SOAP generation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating SOAP note: {str(e)}")

@app.post("/gen-soap-note-stream")
async def generate_soap_note_stream(request: SOAPGenerationRequest):
    """Generate SOAP note with streaming response for each section"""
    try:
        session_id = request.session_id
        transcript_s3_uri = request.transcript_s3_uri
        user_id = request.user_id
        
        # Extract patient data from request
        patient_data = {
            "firstname": request.firstname,
            "middlename": request.middlename,
            "lastname": request.lastname,
            "gender": request.gender,
            "dob": request.dob,
            "weight": request.weight,
            "height_feet": request.height_feet,
            "height_inch": request.height_inch,
            "past_medical_history": request.pastMedicalHistory,
            "past_surgery_history": request.pastSurgicalHistory,
        }
        
        if not transcript_s3_uri:
            raise HTTPException(status_code=400, detail="transcript_s3_uri is required")
        
        logger.info(f"Starting streaming SOAP note generation for session: {session_id}")
        
        async def generate_soap_stream():
            try:
                # Send initial status immediately
                yield f"data: {json.dumps({'type': 'status', 'message': 'Starting SOAP note generation', 'session_id': session_id})}\n\n"
                await asyncio.sleep(0.1)  # Small delay to ensure immediate delivery
                
                # Download and process transcript
                yield f"data: {json.dumps({'type': 'status', 'message': 'Downloading transcript...', 'session_id': session_id})}\n\n"
                await asyncio.sleep(0.1)
                
                local_transcript_path = download_transcript_to_tmp(transcript_s3_uri)
                transcript_content = read_transcript_from_local(local_transcript_path)
                logger.info(f"Transcript downloaded and processed from {transcript_s3_uri}")
                
                yield f"data: {json.dumps({'type': 'status', 'message': 'Transcript processed. Initializing AI models...', 'session_id': session_id})}\n\n"
                await asyncio.sleep(0.1)
                
                # Initialize SOAP generator
                soap_generator = SOAPGenerator(
                    LTLM_CONFIG["primary_model"],
                    LTLM_CONFIG["fallback_models"],
                    LTLM_CONFIG["model_configs"],
                    transcript_content
                )
                
                # Initialize status in DB if available
                if session_data_db and user_id:
                    initial_note = {"status": "in_progress"}
                    session_data_db.update_field_composite(session_id, user_id, "soap_note", initial_note)
                
                yield f"data: {json.dumps({'type': 'status', 'message': 'AI models ready. Starting SOAP generation...', 'session_id': session_id})}\n\n"
                await asyncio.sleep(0.1)
                
                # Process each SOAP section and stream results
                soap_note = {"status": "in_progress"}
                
                for index, section in enumerate(SOAP_SECTIONS, start=1):
                    logger.info(f"Generating {section} section...")
                    
                    # Send section start notification
                    yield f"data: {json.dumps({'type': 'section_start', 'section': section, 'message': f'Generating {section} section...'})}\n\n"
                    await asyncio.sleep(0.1)  # Ensure immediate delivery
                    
                    # Generate section content with streaming
                    def generate_section_stream():
                        return list(soap_generator.process_soap_section_stream(section, patient_data))
                    
                    # Run in thread to prevent blocking
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        stream_events = await asyncio.get_event_loop().run_in_executor(
                            executor, generate_section_stream
                        )
                    
                    # Stream the events as they come
                    section_content = ""
                    for event in stream_events:
                        yield f"data: {json.dumps(event)}\n\n"
                        await asyncio.sleep(0.01)  # Small delay for real-time feel
                        
                        # Capture final content for database storage
                        if event.get('type') == 'section_complete':
                            section_content = event.get('content', '')
                            soap_note[section] = section_content
                    
                    # Send section completion summary
                    section_data = {
                        'type': 'section_summary',
                        'section': section,
                        'progress': f"{index}/{len(SOAP_SECTIONS)}",
                        'message': f'Completed {section} section'
                    }
                    yield f"data: {json.dumps(section_data)}\n\n"
                    await asyncio.sleep(0.1)  # Ensure immediate delivery
                    
                    # Update status if all sections completed
                    if index == len(SOAP_SECTIONS):
                        soap_note["status"] = "completed"
                    
                    # Update database after each section if available
                    if session_data_db and user_id:
                        session_data_db.update_field_composite(session_id, user_id, "soap_note", soap_note)
                        logger.info(f"Updated {section} section in database")
                        
                        # Send database update confirmation
                        yield f"data: {json.dumps({'type': 'status', 'message': f'{section} section saved to database', 'session_id': session_id})}\n\n"
                        await asyncio.sleep(0.1)
                
                # Send final completion status
                completion_data = {
                    'type': 'complete',
                    'message': 'SOAP note generation completed',
                    'session_id': session_id,
                    'soap_note': soap_note
                }
                yield f"data: {json.dumps(completion_data)}\n\n"
                
                logger.info(f"SOAP note generation completed for session ID: {session_id}")
                
            except Exception as e:
                logger.error(f"Error in streaming SOAP generation: {str(e)}", exc_info=True)
                
                # Send error notification
                error_data = {
                    'type': 'error',
                    'message': f'Error generating SOAP note: {str(e)}',
                    'session_id': session_id
                }
                yield f"data: {json.dumps(error_data)}\n\n"
                
                # Try to update the note with error status
                if session_data_db and session_id and user_id:
                    try:
                        error_note = {"status": "error", "error_message": str(e)}
                        session_data_db.update_field_composite(session_id, user_id, "soap_note", error_note)
                    except Exception as update_error:
                        logger.error(f"Failed to update error status: {str(update_error)}")
        
        return StreamingResponse(
            generate_soap_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating streaming SOAP note generation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error initiating streaming SOAP note generation: {str(e)}")

@app.get("/soap-note/{session_id}")
async def get_soap_note(session_id: str, user_id: Optional[str] = None):
    """Get SOAP note status and content"""
    try:
        if not session_data_db:
            raise HTTPException(status_code=503, detail="Database service unavailable")
            
        if user_id:
            # Get from composite key
            item = session_data_db.table.get_item(
                Key={'pk': session_id, 'user_id': user_id}
            ).get('Item')
        else:
            # Get from simple key
            item = session_data_db.get_item(session_id)
            
        if not item:
            raise HTTPException(status_code=404, detail="Session not found")
            
        soap_note = item.get('soap_note')
        if not soap_note:
            return {"session_id": session_id, "status": "not_started"}
            
        # Parse JSON string if needed
        if isinstance(soap_note, str):
            soap_note = json.loads(soap_note)
            
        return {
            "session_id": session_id,
            "status": soap_note.get("status", "unknown"),
            "soap_note": soap_note
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving SOAP note: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error retrieving SOAP note: {str(e)}")

# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )