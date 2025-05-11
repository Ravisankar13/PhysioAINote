import OpenAI from "openai";
import fs from "fs";
import path from "path";
import os from "os";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI();

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
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}> {
  try {
    console.log("Analyzing transcription to extract SOAP elements");
    
    // Use OpenAI to analyze the transcript and extract SOAP elements
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert physiotherapist specializing in analyzing clinical sessions and extracting relevant information for SOAP notes. 
          Your task is to analyze a transcription of a physiotherapy session and extract the following elements:
          
          1. Subjective: All information reported by the patient (symptoms, pain levels, concerns, history, etc.)
          2. Objective: All observations and measurements taken by the physiotherapist (range of motion, strength tests, palpation findings, etc.)
          3. Assessment: The physiotherapist's clinical reasoning, diagnosis, problem list
          4. Plan: Treatment provided, goals, future plan, home exercises, etc.
          
          Format your response as JSON with these four sections.`,
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
    
    console.log("Successfully analyzed transcription");
    
    return {
      subjective: result.subjective || "",
      objective: result.objective || "",
      assessment: result.assessment || "",
      plan: result.plan || "",
    };
  } catch (error: any) {
    console.error("Error analyzing transcription:", error);
    throw new Error(`Failed to analyze transcription: ${error.message || 'Unknown error'}`);
  }
}