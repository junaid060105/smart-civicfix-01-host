"""
civicfix-adminGetAllIssues
GET /api/admin/issues?status={filter}&page={n}
Admin-only: Returns all issues across all users.
"""
import json
import boto3
from decimal import Decimal
from boto3.dynamodb.conditions import Attr

dynamodb = boto3.resource("dynamodb")
issues_table = dynamodb.Table("civicfix-issues")


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

        params = event.get("queryStringParameters") or {}
        status_filter = params.get("status", "all")

        # Scan with optional status filter
        scan_kwargs = {}
        if status_filter and status_filter != "all":
            scan_kwargs["FilterExpression"] = Attr("status").eq(status_filter)

        response = issues_table.scan(**scan_kwargs)
        items = response.get("Items", [])

        # Handle pagination if table is large
        while "LastEvaluatedKey" in response:
            scan_kwargs["ExclusiveStartKey"] = response["LastEvaluatedKey"]
            response = issues_table.scan(**scan_kwargs)
            items.extend(response.get("Items", []))

        # Sort by createdAt descending
        items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)

        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": json.dumps({"issues": items}, cls=DecimalEncoder)
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
