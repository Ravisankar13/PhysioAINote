import os
import json
import uuid
import logging
import boto3
from typing import Dict, Optional, Any
from botocore.exceptions import ClientError

from dotenv import load_dotenv

load_dotenv()

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB client
dynamodb = boto3.resource(
    'dynamodb',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_REGION', 'us-east-1')
)


class DynamoDBManager:
    """Class to handle all DynamoDB operations"""
    
    def __init__(self, table_name: str):
        """
        Initialize the DynamoDB manager
        
        Args:
            table_name: The name of the DynamoDB table
        """
        self.table = dynamodb.Table(table_name)
        self.table_name = table_name
    
    def save_item(self, data: Dict[str, Any], pk_field: str = 'pk', sk_field: str = 'user_id') -> str:
        """
        Save an item to DynamoDB. If the primary key exists in the data and in the table,
        it will update only the provided fields. Otherwise, it will create a new record.
        
        Args:
            data: Dictionary containing item data
            pk_field: Name of the partition key field (defaults to 'pk')
            sk_field: Name of the sort key field (defaults to 'user_id')
            
        Returns:
            The primary key of the saved/updated item
        """
        try:
            # Generate UUID for PK if not provided
            if pk_field not in data or not data[pk_field]:
                data[pk_field] = str(uuid.uuid4())
                
            # Check if we need to create a new item or update existing
            create_new = True
            if data.get(pk_field) and data.get(sk_field):
                # Try to get existing item with the composite key
                try:
                    response = self.table.get_item(
                        Key={
                            pk_field: data[pk_field],
                            sk_field: data[sk_field]
                        }
                    )
                    existing_item = response.get('Item')
                    create_new = existing_item is None
                except ClientError:
                    create_new = True

            if not create_new:
                # For updates, we only include fields that are explicitly provided in the data
                processed_data = {}
                for key, value in data.items():
                    # Skip the key fields as they're used in the Key condition
                    if key not in [pk_field, sk_field]:
                        if isinstance(value, (dict, list)):
                            processed_data[key] = json.dumps(value)
                        else:
                            processed_data[key] = value
                
                # Update only the fields that are explicitly provided
                if processed_data:
                    update_expression = "set " + ", ".join(f"{k}=:{k}" for k in processed_data.keys())
                    expression_values = {f":{k}": v for k, v in processed_data.items()}
                    
                    self.table.update_item(
                        Key={
                            pk_field: data[pk_field],
                            sk_field: data[sk_field]
                        },
                        UpdateExpression=update_expression,
                        ExpressionAttributeValues=expression_values
                    )
                    logger.info(f"Successfully updated item in {self.table_name} with {pk_field}: {data[pk_field]}, {sk_field}: {data[sk_field]}")
                else:
                    logger.info(f"No fields to update for item with {pk_field}: {data[pk_field]}, {sk_field}: {data[sk_field]}")
            else:
                # For new records, include all fields
                processed_data = data.copy()
                # Convert any dict/list to JSON strings for fields requiring it
                for key, value in processed_data.items():
                    if isinstance(value, (dict, list)):
                        processed_data[key] = json.dumps(value)
                
                # Save to DynamoDB
                self.table.put_item(Item=processed_data)
                logger.info(f"Successfully created new item in {self.table_name} with {pk_field}: {data[pk_field]}, {sk_field}: {data.get(sk_field, 'N/A')}")
            
            return data[pk_field]
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            logger.error(f"DynamoDB error ({error_code}) saving item to {self.table_name}: {error_message}")
            raise
        except Exception as e:
            logger.error(f"Error saving item to {self.table_name}: {str(e)}")
            raise
    
    def get_item(self, pk: str, pk_field: str = 'pk') -> Optional[Dict[str, Any]]:
        """
        Retrieve an item from DynamoDB
        
        Args:
            pk: Primary key value
            pk_field: Name of the primary key field
            
        Returns:
            The retrieved item or None if not found
        """
        try:
            response = self.table.get_item(Key={pk_field: pk})
            
            if 'Item' in response:
                item = response['Item']
                logger.info(f"Successfully retrieved item from {self.table_name} with {pk_field}: {pk}")
                return item
            else:
                logger.warning(f"No item found in {self.table_name} with {pk_field}: {pk}")
                return None
        except ClientError as e:
            logger.error(f"Error retrieving item from {self.table_name}: {str(e)}")
            return None
    
    def update_field(self, pk: str, field_name: str, field_value: Any, pk_field: str = 'pk') -> bool:
        """
        Update a specific field in a DynamoDB item
        
        Args:
            pk: Primary key value
            field_name: Name of the field to update
            field_value: New value for the field
            pk_field: Name of the primary key field
            
        Returns:
            Boolean indicating success or failure
        """
        try:
            # Convert dict/list to JSON if needed
            if isinstance(field_value, (dict, list)):
                field_value = json.dumps(field_value)
            
            self.table.update_item(
                Key={pk_field: pk},
                UpdateExpression=f"set {field_name} = :val",
                ExpressionAttributeValues={
                    ':val': field_value
                }
            )
            logger.info(f"Successfully updated {field_name} for item with {pk_field}: {pk}")
            return True
        except Exception as e:
            logger.error(f"Error updating {field_name} for item with {pk_field}: {pk}. Error: {str(e)}")
            return False
    
    def delete_item(self, pk: str, pk_field: str = 'pk') -> bool:
        """
        Delete an item from DynamoDB
        
        Args:
            pk: Primary key value
            pk_field: Name of the primary key field
            
        Returns:
            Boolean indicating success or failure
        """
        try:
            self.table.delete_item(Key={pk_field: pk})
            logger.info(f"Successfully deleted item from {self.table_name} with {pk_field}: {pk}")
            return True
        except Exception as e:
            logger.error(f"Error deleting item from {self.table_name}: {str(e)}")
            return False
        
    def update_field_composite(self, pk: str, user_id: str, field_name: str, field_value: Any) -> bool:
        """
        Update a specific field in a DynamoDB item with composite key
        Args:
            pk: Partition key value
            user_id: Sort key value
            field_name: Name of the field to update
            field_value: New value for the field
        Returns:
            Boolean indicating success or failure
        """
        try:
            # Convert dict/list to JSON if needed
            if isinstance(field_value, (dict, list)):
                field_value = json.dumps(field_value)
                
            self.table.update_item(
                Key={
                    'pk': pk,
                    'user_id': user_id
                },
                UpdateExpression=f"set {field_name} = :val",
                ExpressionAttributeValues={
                    ':val': field_value
                }
            )
            logger.info(f"Successfully updated {field_name} for item with pk={pk}, user_id={user_id}")
            return True
        except Exception as e:
            logger.error(f"Error updating {field_name} for item with pk={pk}, user_id={user_id}. Error: {str(e)}")
            return False


def update_item_in_dynamodb(pk_value, update_expression, expression_attribute_values, expression_attribute_names=None):
    """
    Update an existing item in DynamoDB
    Args:
        pk_value (str): The primary key value (partition key)
        update_expression (str): The update expression
        expression_attribute_values (dict): The expression attribute values
        expression_attribute_names (dict, optional): The expression attribute names
    Returns:
        dict: The response from DynamoDB
    """
    try:
        # First, we need to get the item to find its user_id (sort key)
        item = get_from_dynamodb(pk_value)
        if not item:
            raise Exception(f"Item with pk {pk_value} not found")
        
        # Extract the user_id from the item to complete the composite key
        user_id = item.get('user_id')
        if not user_id:
            raise Exception(f"Item with pk {pk_value} does not have a user_id")
        
        # Create the full composite key
        key = {
            'pk': pk_value,
            'user_id': user_id
        }
        
        logger.info(f"Updating item with composite key: {key}")
        logger.info(f"Update expression: {update_expression}")
        
        params = {
            'Key': key,
            'UpdateExpression': update_expression,
            'ExpressionAttributeValues': expression_attribute_values,
            'ReturnValues': "ALL_NEW"
        }
        
        if expression_attribute_names:
            params['ExpressionAttributeNames'] = expression_attribute_names
            
        response = table.update_item(**params)
        updated_item = response.get('Attributes')
        logger.info(f"Item updated successfully: {updated_item is not None}")
        return _decimal_to_float(updated_item)
    except Exception as e:
        logger.error(f"Error updating item in DynamoDB: {str(e)}")
        raise


# Create singleton instances for commonly used tables
session_data_db = DynamoDBManager('physio-convo-session-data')