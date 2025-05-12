import OpenAI from "openai";
import fs from "fs";
import path from "path";
import os from "os";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(filePath: string): Promise<string> {
  try {
    console.log(`Transcribing audio file at path: ${filePath}`);
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found at path: ${filePath}`);
    }
    
    // Get file stats
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error('Audio file is empty (0 bytes)');
    }
    
    console.log(`Audio file size: ${stats.size} bytes`);
    
    // Create a readable stream for the audio file
    const audioReadStream = fs.createReadStream(filePath);
    
    // Verify API key exists
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not found in environment variables');
    }
    
    try {
      // Call OpenAI Whisper API to transcribe the audio
      console.log('Calling OpenAI Whisper API...');
      const transcription = await openai.audio.transcriptions.create({
        file: audioReadStream,
        model: "whisper-1",
        language: "en",
        response_format: "json",
      });
      
      console.log("Transcription successful");
      
      // Return the transcribed text
      return transcription.text || '';
    } catch (apiError: any) {
      console.error('OpenAI API error:', apiError);
      
      // Handle specific OpenAI API errors
      if (apiError.status === 401) {
        throw new Error('OpenAI API key is invalid or expired');
      } else if (apiError.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      } else if (apiError.message?.includes('audio file format')) {
        throw new Error('Audio file format not supported by OpenAI. Please use WAV, MP3, or MP4 format.');
      }
      
      // Re-throw with more context
      throw new Error(`OpenAI API Error: ${apiError.message || 'Unknown error'}`);
    }
  } catch (error: any) {
    console.error("Error transcribing audio:", error);
    throw new Error(`Failed to transcribe audio: ${error.message || 'Unknown error'}`);
  } finally {
    // Clean up: delete the temporary file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Temporary file deleted: ${filePath}`);
      }
    } catch (err) {
      console.warn(`Warning: Could not delete temporary file ${filePath}:`, err);
    }
  }
}

export async function analyzeTranscription(transcript: string): Promise<{
  transcription: string;
  clinicalInsights: string;
}> {
  try {
    console.log("Generating clinical insights from transcription");
    
    // Use OpenAI to extract clinical insights without forcing SOAP format
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert physiotherapist specializing in analyzing clinical sessions. 
          Your task is to analyze a transcription of a physiotherapy session and extract key clinical information.
          
          Please analyze the text and provide a structured summary that includes relevant clinical information such as:
          - Patient history and presenting complaints
          - Key examination findings
          - Possible diagnoses or clinical impressions
          - Treatment recommendations and plan
          - Any other clinically relevant information
          
          Do not force the information into strict SOAP format if it doesn't naturally fit. Instead, provide a coherent, 
          clinically relevant summary that captures the important details from the transcription.
          
          Format your response as JSON with these sections:
          {
            "clinicalSummary": "A well-organized summary of all important clinical information"
          }`,
        },
        {
          role: "user",
          content: transcript,
        },
      ],
      response_format: { type: "json_object" },
    });
    
    // Parse the response
    const content = response.choices[0].message.content as string;
    const result = JSON.parse(content);
    
    console.log("Successfully generated clinical insights");
    
    return {
      transcription: transcript || "",
      clinicalInsights: result.clinicalSummary || "",
    };
  } catch (error: any) {
    console.error("Error generating clinical insights:", error);
    // Return just the transcription if analysis fails
    return {
      transcription: transcript || "",
      clinicalInsights: "Error analyzing transcription. Raw transcription is available.",
    };
  }
}