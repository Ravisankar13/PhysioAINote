# SOAP Note Generator API

A FastAPI-based application that generates SOAP (Subjective, Objective, Assessment, Plan) notes from patient-therapist conversation transcripts using LiteLLM and various AI models.

## Features

- **SOAP Note Generation**: Automatically generates comprehensive SOAP notes from conversation transcripts
- **Multiple AI Models**: Uses LiteLLM with support for multiple AI models (OpenAI GPT, Claude, etc.)
- **Asynchronous Processing**: Supports both synchronous and asynchronous SOAP note generation
- **Patient Data Management**: Store and manage patient demographic information
- **Database Integration**: Optional DynamoDB integration for persistent storage
- **RESTful API**: Clean REST API with comprehensive documentation
- **Health Monitoring**: Built-in health check endpoints

## Architecture

The application was originally designed as an AWS Lambda function and has been converted to a FastAPI application while maintaining the same core functionality:

- **main.py**: FastAPI application with all API endpoints
- **soap_generator.py**: Core SOAP note generation logic using LiteLLM
- **db_utils.py**: Database operations (DynamoDB)
- **utils.py**: Utility functions for file operations and data formatting
- **http_utils.py**: HTTP utilities and response formatting
- **all_prompts/**: Directory containing prompt templates for different SOAP sections

## Installation

### Prerequisites

- Python 3.8 or higher
- AWS credentials (if using DynamoDB)
- API keys for AI models (OpenAI, Anthropic, etc.)

### Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd soap-note-litellm-streaming
   ```

2. **Install dependencies**:
   ```bash
   poetry install
   ```


3. **Environment Configuration**:
   Create a `.env` file in the root directory:
   ```env
   # AI Model API Keys
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   
   # AWS Configuration (if using DynamoDB)
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_DEFAULT_REGION=your_aws_region
   
   # Langfuse Configuration (optional)
   LANGFUSE_PUBLIC_KEY=your_langfuse_public_key
   LANGFUSE_SECRET_KEY=your_langfuse_secret_key
   LANGFUSE_HOST=your_langfuse_host
   ```

## Running the Application

### Development Server

```bash
# Run with auto-reload
poetry run uvicorn main:app --reload --port 8030
# http://127.0.0.1:8030 
# uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Or using Python directly
python main.py
```

### Production Deployment

```bash
# Using Gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# Using Docker (create Dockerfile first)
docker build -t soap-note-api .
docker run -p 8000:8000 soap-note-api
```

## API Documentation

Once the server is running, you can access:

- **Interactive API Documentation**: http://localhost:8000/docs
- **Alternative Documentation**: http://localhost:8000/redoc
- **OpenAPI Schema**: http://localhost:8000/openapi.json

## API Endpoints

### Health Check
- `GET /` - Root endpoint
- `GET /health` - Health check

### Patient Data Management
- `POST /save-demographic-data` - Save patient demographic information

### SOAP Note Generation
- `POST /gen-soap-note` - Generate SOAP note asynchronously
- `POST /gen-soap-note-sync` - Generate SOAP note synchronously
- `POST /gen-soap-note-stream` - Generate SOAP note with real-time streaming
- `GET /soap-note/{session_id}` - Retrieve SOAP note status and content

## Usage Examples

### Save Patient Data

```bash
curl -X POST "http://localhost:8000/save-demographic-data" \
     -H "Content-Type: application/json" \
     -d '{
       "firstname": "John",
       "lastname": "Doe",
       "gender": "Male",
       "dob": "1990-01-01",
       "weight": "70kg",
       "height_feet": "5",
       "height_inch": "10",
       "pastMedicalHistory": "No significant history",
       "pastSurgicalHistory": "None"
     }'
```

### Generate SOAP Note (Async)

```bash
curl -X POST "http://localhost:8000/gen-soap-note" \
     -H "Content-Type: application/json" \
     -d '{
       "session_id": "05d6ca4d-4f21-4548-9665-e227f9d7cdda",
       "transcript_s3_uri": "s3://physio-convo-data/05d6ca4d-4f21-4548-9665-e227f9d7cdda/transcript.csv",
       "user_id": "c65250e6-71aa-42a1-bd0e-b9e961fc0578",
       "firstname": "Test Pushkar June 23",
       "middlename": "",
       "lastname": "",
       "gender": "",
       "dob": "",
       "weight": "",
       "height_feet": "",
       "height_inch": "",
       "pastMedicalHistory": "",
       "pastSurgicalHistory": ""
     }'
```

### Generate SOAP Note (Sync)

```bash
curl -X POST "http://localhost:8000/gen-soap-note-sync" \
     -H "Content-Type: application/json" \
     -d '{
       "session_id": "05d6ca4d-4f21-4548-9665-e227f9d7cdda",
       "transcript_s3_uri": "s3://physio-convo-data/05d6ca4d-4f21-4548-9665-e227f9d7cdda/transcript.csv",
       "user_id": "c65250e6-71aa-42a1-bd0e-b9e961fc0578",
       "firstname": "Test Pushkar June 23",
       "lastname": "",
       "gender": "Male"
     }'
```

### Retrieve SOAP Note

```bash
curl -X GET "http://localhost:8000/soap-note/unique-session-id?user_id=user123"
```

### Generate SOAP Note (Streaming)

The streaming endpoint provides real-time updates as each section is generated:

```bash
# Using the provided test script
./test_streaming.sh

# Or using curl directly
curl -X POST "http://localhost:8030/gen-soap-note-stream" \
     -H "Content-Type: application/json" \
     -d '{
       "session_id": "05d6ca4d-4f21-4548-9665-e227f9d7cdda",
       "transcript_s3_uri": "s3://physio-convo-data/05d6ca4d-4f21-4548-9665-e227f9d7cdda/transcript.csv",
       "user_id": "c65250e6-71aa-42a1-bd0e-b9e961fc0578",
       "firstname": "Test Pushkar June 23"
     }' \
     --no-buffer

# Or use the Python client
python stream_client_example.py

# Or open the web client
# Open stream_client_web.html in your browser
```

## Configuration

### AI Models Configuration

The application supports multiple AI models through LiteLLM. Configure in `main.py`:

```python
LTLM_CONFIG = {
    "primary_model": "gpt-4o",
    "fallback_models": ["claude-3-5-sonnet-20240620"],
    "model_configs": {
        "gpt-4o": {"max_tokens": 5000, "temperature": 0.1},
        "claude-3-5-sonnet-20240620": {"max_tokens": 5000, "temperature": 0.1},
    }
}
```

### SOAP Sections

Configure which sections to generate:

```python
SOAP_SECTIONS = [
    "subjective",
    "objective", 
    "assessment",
    "plan",
    "goals",
    "treatment"
]
```

### Database Configuration

If using DynamoDB, ensure your table has the correct structure:
- Partition Key: `pk` (String)
- Sort Key: `user_id` (String)

## Prompt Templates

The application uses prompt templates stored in the `all_prompts/` directory:

- `promptfile.txt` - Main system prompt
- `subjective_template.txt` - Subjective section template
- `objective_template.txt` - Objective section template
- `assessment_template.txt` - Assessment section template
- `plan_template.txt` - Plan section template
- `goals_template.txt` - Goals section template
- `treatment_template.txt` - Treatment section template

## Development

### Code Quality

```bash
# Format code
black .

# Lint code
flake8 .

# Type checking
mypy .

# Run tests
pytest
```

### Project Structure

```
soap-note-litellm-streaming/
├── all_prompts/              # Prompt templates
├── main.py                   # FastAPI application
├── soap_generator.py         # SOAP generation logic
├── db_utils.py              # Database utilities
├── utils.py                 # General utilities
├── http_utils.py            # HTTP utilities
├── pyproject.toml           # Project configuration
├── README.md                # This file
└── .env                     # Environment variables
```

## Troubleshooting

### Common Issues

1. **Missing API Keys**: Ensure all required API keys are set in your `.env` file
2. **Database Connection**: Check AWS credentials and region settings
3. **Model Availability**: Verify that the configured AI models are available and accessible
4. **Port Conflicts**: Change the port if 8000 is already in use

### Logging

The application uses Python's standard logging. Logs include:
- Request/response information
- SOAP generation progress
- Error details
- Database operations

### Error Handling

The API provides detailed error messages:
- 400: Bad Request (missing required fields)
- 404: Not Found (session not found)
- 500: Internal Server Error (processing errors)
- 503: Service Unavailable (database unavailable)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Create an issue in the repository

## Changelog

### Version 1.0.0
- Initial FastAPI conversion from AWS Lambda
- Added synchronous and asynchronous SOAP generation
- Comprehensive API documentation
- Health check endpoints
- Error handling improvements