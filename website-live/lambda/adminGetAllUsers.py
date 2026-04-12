"""
civicfix-adminGetAllUsers
GET /api/admin/users
Admin-only: Returns all registered users.
"""
import json
import boto3
from decimal import Decimal

dynamodb = boto3.resource("dynamodb")
users_table = dynamodb.Table("civicfix-users")


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return int(o) if o % 1 == 0 else float(o)
        return super().default(o)


def lambda_handler(event, context):
    try:
        # Verify admin
        claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
        groups = claims.get("cognito:groups", "")
        if "admin" not in groups:
            return error_response(403, "Admin access required")

        response = users_table.scan()
        items = response.get("Items", [])

        # Handle pagination
        while "LastEvaluatedKey" in response:
            response = users_table.scan(ExclusiveStartKey=response["LastEvaluatedKey"])
            items.extend(response.get("Items", []))

        # Sort by createdAt descending
        items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)

        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": json.dumps({"users": items}, cls=DecimalEncoder)
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
