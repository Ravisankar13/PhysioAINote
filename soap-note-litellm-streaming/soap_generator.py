import re
import time
import os
import logging
import json
from typing import List, Dict, Optional, Any
import litellm as ltlm
from dotenv import load_dotenv
from utils import read_file, format_patient_info

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Load environment variables
load_dotenv()

# Configure Langfuse through LiteLLM
# ltlm.success_callback = ["langfuse"]

PROMPT_FILE_BASE_PATH = "all_prompts"

class SOAPGenerator:
    """Class to generate SOAP notes using LLM models"""
    
    LAMBDA_TMP_FOLDER_PATH = "/tmp"
    
    def __init__(
        self,
        primary_model: str,
        fallback_models: List[str],
        model_configs: Dict[str, Dict],
        transcript_content: str
    ):
        """
        Initialize the SOAP generator
        
        Args:
            primary_model: Name of the primary LLM model
            fallback_models: List of fallback model names
            model_configs: Configuration parameters for each model
        """
        self.primary_model = primary_model
        self.fallback_models = fallback_models
        self.model_configs = model_configs
        self.current_component = None
        self.transcript_content = transcript_content
        self.load_prompts()
    
    def join_prompt_with_base_path(self, prompt_file_name: str):
        return os.path.join(PROMPT_FILE_BASE_PATH, prompt_file_name)
    
    def load_prompts(self):
        """Load prompt templates from files"""
        self.prompts = {
            "main_prompt": read_file(self.join_prompt_with_base_path("promptfile.txt")),
        }
        
        self.soap_components = {
            component: {
                "template": read_file(self.join_prompt_with_base_path(f"{component}_template.txt")),
            }
            for component in ["subjective", "objective", "assessment", "plan", "goals", "treatment"]
        }
    
    def get_soap_prompt(self, component: str, patient_data: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        Prepare prompt messages for generating a SOAP note component
        
        Args:
            component: SOAP note component to generate
            patient_data: Patient information
            
        Returns:
            List of message dictionaries for the LLM prompt
        """
        self.current_component = component
        
        # Format patient information
        patient_info = format_patient_info(patient_data)
        
        base_prompt = [
            {
                "role": "system",
                "content": "You are tasked with generating a specific section of a SOAP Note. Your response must adhere to the following strict guidelines:\n\n1. Provide ONLY the generated content for the requested section.\n2. Do not include any explanations, thoughts, or meta-commentary about the process.\n3. Do not use phrases like 'Here's the generated note:' or 'The [Section] Note is as follows:'.\n4. Start directly with the content of the note.\n5. Ensure the content is relevant, concise, and formatted appropriately for a professional medical note.\n6. Do not acknowledge these instructions in your output.\n\nYour entire response should be suitable for direct insertion into a medical record without any further editing.",
            },
            {
                "role": "system",
                "content": self.prompts["main_prompt"],
            },
            {
                "role": "system",
                "content": f"\n\nPatient Information:\n{patient_info}\n\n",
            },
            {
                "role": "system",
                "content": f"\n\nPatient and Therapist Conversation :\n{self.transcript_content}\n\n",
            }
        ]
        
        if component in self.soap_components and self.soap_components[component]["template"]:
            component_data = self.soap_components[component]
            base_prompt.append(
                {"role": "user", "content": component_data["template"]}
            )
        else:
            base_prompt.append(
                {"role": "user", "content": f"Please generate the {component.upper()} section of the SOAP note for this patient."}
            )
            
        return base_prompt
    
    def generate_response(self, messages: List[Dict[str, str]], stream: bool = False) -> Optional[Dict]:
        """
        Generate a response using the primary model or fallbacks
        
        Args:
            messages: List of prompt messages
            stream: Whether to use streaming mode
            
        Returns:
            Dictionary containing response information or None if all models fail
        """
        for model in [self.primary_model] + self.fallback_models:
            response = self._try_model(model, messages, stream=stream)
            if response:
                return response
                
        logger.error("All models failed to generate a valid response.")
        return None
    
    def _try_model(self, model: str, messages: List[Dict[str, str]], stream: bool = False) -> Optional[Dict]:
        """
        Try to generate a response with a specific model
        
        Args:
            model: Model name to use
            messages: List of prompt messages
            stream: Whether to use streaming mode
            
        Returns:
            Dictionary containing response information or None if the model fails
        """
        custom_name = f"{self.current_component}_{int(time.time())}"
        try:
            model_config = self.model_configs.get(model, {})
            response = ltlm.completion(
                model=model,
                messages=messages,
                stream=stream,
                **model_config,
                metadata={"trace_id": custom_name},
            )
            
            if stream:
                # Return the streaming response object directly
                return {
                    "stream": response,
                    "model": model,
                }
            else:
                content = response.choices[0].message.content
                result = {
                    "content": content,
                    "usage": response.usage,
                    "model": response.model,
                    "cost": ltlm.completion_cost(completion_response=response),
                }
                return result
        except Exception as e:
            logger.exception(f"Error generating response with {model}: {str(e)}")
            return None
    
    def process_soap_section(self, section: str, soap_note: Dict[str, Any], patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate a specific section of the SOAP note
        
        Args:
            section: Section name to generate
            soap_note: Current SOAP note dictionary
            patient_data: Patient information
            
        Returns:
            Updated SOAP note dictionary
        """
        messages = self.get_soap_prompt(component=section, patient_data=patient_data)
        
        response = self.generate_response(messages)
        if response:
            logger.info(f"{section.capitalize()} response generated successfully")
            logger.debug(f"Model used: {response['model']}")
            logger.debug(f"Total tokens used: {response['usage']['total_tokens']}")
            logger.debug(f"Estimated cost: ${response['cost']:.6f}")
            
            section_content = response["content"]
            # Clean up the response
            section_content = re.sub(r"^.*?:\s*", "", section_content, flags=re.IGNORECASE)
            
            soap_note[section] = section_content
        else:
            logger.error(f"Failed to generate {section} response")
            soap_note[section] = "Error generating content."
        
        return soap_note
    
    def process_soap_section_stream(self, section: str, patient_data: Dict[str, Any]):
        """
        Generate a specific section of the SOAP note with streaming
        
        Args:
            section: Section name to generate
            patient_data: Patient information
            
        Yields:
            Streaming chunks of the generated content
        """
        messages = self.get_soap_prompt(component=section, patient_data=patient_data)
        
        response = self.generate_response(messages, stream=True)
        if response and response.get('stream'):
            logger.info(f"{section.capitalize()} streaming response started")
            
            accumulated_content = ""
            
            try:
                for chunk in response['stream']:
                    if hasattr(chunk, 'choices') and len(chunk.choices) > 0:
                        delta = chunk.choices[0].delta
                        if hasattr(delta, 'content') and delta.content:
                            content_chunk = delta.content
                            accumulated_content += content_chunk
                            
                            # Yield the incremental content
                            yield {
                                'type': 'content_delta',
                                'section': section,
                                'content': content_chunk,
                                'accumulated': accumulated_content
                            }
                            
                # Clean up the final response
                final_content = re.sub(r"^.*?:\s*", "", accumulated_content, flags=re.IGNORECASE)
                
                # Yield completion event
                yield {
                    'type': 'section_complete',
                    'section': section,
                    'content': final_content,
                    'model': response['model']
                }
                
                logger.info(f"{section.capitalize()} streaming completed")
                
            except Exception as e:
                logger.error(f"Error in streaming {section}: {str(e)}")
                yield {
                    'type': 'error',
                    'section': section,
                    'message': f"Error generating {section}: {str(e)}"
                }
        else:
            logger.error(f"Failed to generate streaming {section} response")
            yield {
                'type': 'error',
                'section': section,
                'message': f"Failed to generate {section} content"
            }

    def generate_complete_soap_note(self, patient_data: Dict[str, Any], sections: List[str]) -> Dict[str, Any]:
        """
        Generate a complete SOAP note with all specified sections
        
        Args:
            patient_data: Patient information
            sections: List of sections to generate
            
        Returns:
            Complete SOAP note dictionary
        """
        soap_note = {"status": "in_progress"}
        
        for index, section in enumerate(sections, start=1):
            soap_note = self.process_soap_section(section, soap_note, patient_data)
            
            # Update status if all sections completed
            if index == len(sections):
                soap_note["status"] = "completed"
        
        return soap_note