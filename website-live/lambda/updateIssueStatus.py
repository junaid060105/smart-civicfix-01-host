"""
civicfix-updateIssueStatus
PATCH /api/admin/issues/{issueId}
Admin-only: Updates issue status. Awards points when resolved.
"""
import json
import boto3
from decimal import Decimal

dynamodb = boto3.resource("dynamodb")
issues_table = dynamodb.Table("civicfix-issues")
users_table = dynamodb.Table("civicfix-users")
stats_table = dynamodb.Table("civicfix-stats")


def lambda_handler(event, context):
    try:
        # Verify admin from Cognito JWT claims
        claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
        groups = claims.get("cognito:groups", "")
        if "admin" not in groups:
            return error_response(403, "Admin access required")

        issue_id = event["pathParameters"]["issueId"]
        body = json.loads(event.get("body", "{}"))
        new_status = body.get("status")

        if new_status not in ("reported", "in-progress", "resolved"):
            return error_response(400, "Invalid status. Must be: reported, in-progress, or resolved")

        # Get current issue
        resp = issues_table.get_item(Key={"issueId": issue_id})
        issue = resp.get("Item")
        if not issue:
            return error_response(404, "Issue not found")

        old_status = issue.get("status")

        # Update issue status
        issues_table.update_item(
            Key={"issueId": issue_id},
            UpdateExpression="SET #st = :status",
            ExpressionAttributeNames={"#st": "status"},
            ExpressionAttributeValues={":status": new_status}
        )

        # If resolved and not previously resolved → award points and increment counter
        if new_status == "resolved" and old_status != "resolved":
            # Award 20 civic points to the user
            user_id = issue.get("userId")
            if user_id and not issue.get("pointsAwarded"):
                users_table.update_item(
                    Key={"userId": user_id},
                    UpdateExpression="SET points = if_not_exists(points, :zero) + :pts",
                    ExpressionAttributeValues={":pts": 20, ":zero": 0}
                )
                # Mark points as awarded
                issues_table.update_item(
                    Key={"issueId": issue_id},
                    UpdateExpression="SET pointsAwarded = :awarded",
                    ExpressionAttributeValues={":awarded": True}
                )

            # Increment resolved counter
            stats_table.update_item(
                Key={"statId": "global"},
                UpdateExpression="SET totalResolved = if_not_exists(totalResolved, :zero) + :inc",
                ExpressionAttributeValues={":inc": 1, ":zero": 0}
            )

        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": json.dumps({"message": f"Issue status updated to {new_status}"})
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
