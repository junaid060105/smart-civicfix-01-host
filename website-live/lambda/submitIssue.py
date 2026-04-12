"""
civicfix-submitIssue
POST /api/issues
Creates a new issue and increments the global reported counter.
"""
import json
import uuid
import boto3
from datetime import datetime

dynamodb = boto3.resource("dynamodb")
issues_table = dynamodb.Table("civicfix-issues")
stats_table = dynamodb.Table("civicfix-stats")


def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))

        issue_id = str(uuid.uuid4())
        ref_id = body.get("refId", "CF-" + issue_id[:8].upper())

        item = {
            "issueId": issue_id,
            "refId": ref_id,
            "userId": body["userId"],
            "type": body["type"],
            "description": body.get("description", ""),
            "location": body["location"],
            "lat": str(body.get("lat", 0)),
            "lng": str(body.get("lng", 0)),
            "status": "reported",
            "createdAt": datetime.utcnow().isoformat() + "Z",
            "pointsAwarded": False
        }

        # Save issue
        issues_table.put_item(Item=item)

        # Increment global counter
        stats_table.update_item(
            Key={"statId": "global"},
            UpdateExpression="SET totalReported = if_not_exists(totalReported, :zero) + :inc",
            ExpressionAttributeValues={":inc": 1, ":zero": 0}
        )

        return {
            "statusCode": 201,
            "headers": cors_headers(),
            "body": json.dumps({
                "issueId": issue_id,
                "refId": ref_id,
                "message": "Issue submitted successfully"
            })
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
