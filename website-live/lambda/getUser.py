"""
civicfix-getUser
GET /api/users/{userId}
Returns user profile (name, email, points).
"""
import json
import boto3
from decimal import Decimal

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("civicfix-users")


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return int(o) if o % 1 == 0 else float(o)
        return super().default(o)


def lambda_handler(event, context):
    try:
        user_id = event["pathParameters"]["userId"]

        response = table.get_item(Key={"userId": user_id})
        item = response.get("Item")

        if not item:
            return error_response(404, "User not found")

        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": json.dumps(item, cls=DecimalEncoder)
        }

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
