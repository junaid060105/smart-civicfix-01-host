"""
civicfix-trackIssue
GET /api/issues/track/{refId}
Looks up an issue by its reference ID (uses refId-index GSI).
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
        ref_id = event["pathParameters"]["refId"]

        response = table.query(
            IndexName="refId-index",
            KeyConditionExpression=Key("refId").eq(ref_id),
            Limit=1
        )

        items = response.get("Items", [])

        if not items:
            return error_response(404, "Issue not found")

        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": json.dumps(items[0], cls=DecimalEncoder)
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
