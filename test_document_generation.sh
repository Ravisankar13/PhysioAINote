#!/bin/bash

# Test document generation with actual SOAP data
curl -X POST http://localhost:5000/api/documents/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=s%3AqMnvJOsJXJMiFXy82Gh3IfB7SkCBPqWu.7VQTNqLOy4oUEOjmzPD3xzLHH2jUr4%2F6YUrn1zcZa3g" \
  -d '{
    "documentType": "doctor_report",
    "sessionId": "test-session-123",
    "soapData": {
      "subjective": "Patient reports severe left knee pain, especially when going downstairs. Pain has been present for 2 weeks.",
      "objective": "Physical examination reveals tenderness over the patellar tendon. Range of motion limited by pain.",
      "assessment": "Likely patellar tendinitis. Differential includes meniscal injury.",
      "plan": "Rest, ice therapy, quadriceps strengthening exercises. Follow up in 2 weeks."
    },
    "transcript": "Hi, this is Richie. I have severe pain in my left knee, especially when going downstairs. It has been bothering me for about 2 weeks now."
  }'
