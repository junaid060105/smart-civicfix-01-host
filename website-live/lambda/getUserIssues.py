"""
civicfix-getUserIssues
GET /api/issues?userId={userId}
Returns all issues submitted by a specific user.
Uses the userId-index GSI.
"""
import json
import boto3
from decimal import Decimal
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("civicfix-issues")


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return int(o) if o % 1 == 0 else float(o)
        return super().default(o)


def lambda_handler(event, context):
    try:
        params = event.get("queryStringParameters") or {}
        user_id = params.get("userId")

        if not user_id:
            return error_response(400, "userId query parameter is required")

        response = table.query(
            IndexName="userId-index",
            KeyConditionExpression=Key("userId").eq(user_id),
            ScanIndexForward=False  # newest first
        )

        items = response.get("Items", [])

        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": json.dumps(items, cls=DecimalEncoder)
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
