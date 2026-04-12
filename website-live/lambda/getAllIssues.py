"""
civicfix-getAllIssues
GET /api/issues/all
Returns all issues (limited fields) for the homepage map.
"""
import json
import boto3
from decimal import Decimal

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("civicfix-issues")


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return int(o) if o % 1 == 0 else float(o)
        return super().default(o)


def lambda_handler(event, context):
    try:
        # Scan with projection to return only map-relevant fields
        response = table.scan(
            ProjectionExpression="#loc, #tp, #st, lat, lng",
            ExpressionAttributeNames={
                "#loc": "location",
                "#tp": "type",
                "#st": "status"
            }
        )

        items = response.get("Items", [])

        # Convert lat/lng from string to float
        for item in items:
            item["lat"] = float(item.get("lat", 0))
            item["lng"] = float(item.get("lng", 0))

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
