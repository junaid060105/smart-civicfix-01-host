"""
civicfix-adminDeleteIssue
DELETE /api/admin/issues/{issueId}
Admin-only: Deletes an issue and decrements the global counter.
"""
import json
import boto3

dynamodb = boto3.resource("dynamodb")
issues_table = dynamodb.Table("civicfix-issues")
stats_table = dynamodb.Table("civicfix-stats")


def lambda_handler(event, context):
    try:
        # Verify admin
        claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
        groups = claims.get("cognito:groups", "")
        if "admin" not in groups:
            return error_response(403, "Admin access required")

        issue_id = event["pathParameters"]["issueId"]

        # Get the issue first to check status
        resp = issues_table.get_item(Key={"issueId": issue_id})
        issue = resp.get("Item")

        if not issue:
            return error_response(404, "Issue not found")

        was_resolved = issue.get("status") == "resolved"

        # Delete the issue
        issues_table.delete_item(Key={"issueId": issue_id})

        # Decrement counters
        stats_table.update_item(
            Key={"statId": "global"},
            UpdateExpression="SET totalReported = if_not_exists(totalReported, :one) - :dec",
            ExpressionAttributeValues={":dec": 1, ":one": 1}
        )

        if was_resolved:
            stats_table.update_item(
                Key={"statId": "global"},
                UpdateExpression="SET totalResolved = if_not_exists(totalResolved, :one) - :dec",
                ExpressionAttributeValues={":dec": 1, ":one": 1}
            )

        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": json.dumps({"message": "Issue deleted successfully"})
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
