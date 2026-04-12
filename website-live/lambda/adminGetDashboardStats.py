"""
civicfix-adminGetDashboardStats
GET /api/admin/stats
Admin-only: Returns aggregate stats for the admin dashboard.
"""
import json
import boto3
from decimal import Decimal
from boto3.dynamodb.conditions import Attr

dynamodb = boto3.resource("dynamodb")
issues_table = dynamodb.Table("civicfix-issues")
users_table = dynamodb.Table("civicfix-users")
stats_table = dynamodb.Table("civicfix-stats")


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

        # Get global stats
        stats_resp = stats_table.get_item(Key={"statId": "global"})
        stats_item = stats_resp.get("Item", {})

        # Count users
        users_resp = users_table.scan(Select="COUNT")
        total_users = users_resp.get("Count", 0)

        # Count issues by status
        issues_resp = issues_table.scan(Select="COUNT")
        total_issues = issues_resp.get("Count", 0)

        # Count in-progress
        progress_resp = issues_table.scan(
            FilterExpression=Attr("status").eq("in-progress"),
            Select="COUNT"
        )
        total_in_progress = progress_resp.get("Count", 0)

        # Count pending/reported
        pending_resp = issues_table.scan(
            FilterExpression=Attr("status").eq("reported"),
            Select="COUNT"
        )
        total_pending = pending_resp.get("Count", 0)

        result = {
            "totalReported": int(stats_item.get("totalReported", total_issues)),
            "totalResolved": int(stats_item.get("totalResolved", 0)),
            "totalInProgress": total_in_progress,
            "totalPending": total_pending,
            "totalUsers": total_users
        }

        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": json.dumps(result, cls=DecimalEncoder)
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
