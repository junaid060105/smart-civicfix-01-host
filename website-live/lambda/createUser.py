"""
civicfix-createUser
POST /api/users
Creates a user profile in DynamoDB after Cognito sign-up.
"""
import json
import boto3
from datetime import datetime

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("civicfix-users")


def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        user_id = body["userId"]
        name = body["name"]
        email = body["email"]

        table.put_item(
            Item={
                "userId": user_id,
                "name": name,
                "email": email,
                "points": 0,
                "createdAt": datetime.utcnow().isoformat() + "Z"
            }
        )

        return {
            "statusCode": 201,
            "headers": cors_headers(),
            "body": json.dumps({"message": "User created successfully"})
        }

    except KeyError as e:
        return error_response(400, f"Missing required field: {e}")
    except Exception as e:
        return error_response(500, str(e))


def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS"
    }


def error_response(status, message):
    return {
        "statusCode": status,
        "headers": cors_headers(),
        "body": json.dumps({"error": message})
    }
