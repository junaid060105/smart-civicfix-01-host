"""
civicfix-redeemReward
POST /api/rewards/redeem
Deducts civic points and creates a redemption record.
"""
import json
import uuid
import boto3
from datetime import datetime

dynamodb = boto3.resource("dynamodb")
users_table = dynamodb.Table("civicfix-users")
redemptions_table = dynamodb.Table("civicfix-redemptions")


def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        user_id = body["userId"]
        reward = body["reward"]
        cost = int(body["cost"])

        # Get user and check points
        resp = users_table.get_item(Key={"userId": user_id})
        user = resp.get("Item")

        if not user:
            return error_response(404, "User not found")

        current_points = int(user.get("points", 0))
        if current_points < cost:
            return error_response(400, f"Insufficient points. Have {current_points}, need {cost}.")

        # Deduct points (conditional to prevent race conditions)
        users_table.update_item(
            Key={"userId": user_id},
            UpdateExpression="SET points = points - :cost",
            ConditionExpression="points >= :cost",
            ExpressionAttributeValues={":cost": cost}
        )

        # Generate coupon code
        coupon_code = f"CF-{reward.upper()}-{uuid.uuid4().hex[:6].upper()}"

        # Save redemption record
        redemptions_table.put_item(
            Item={
                "redemptionId": str(uuid.uuid4()),
                "userId": user_id,
                "reward": reward,
                "code": coupon_code,
                "cost": cost,
                "redeemedAt": datetime.utcnow().isoformat() + "Z"
            }
        )

        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": json.dumps({
                "couponCode": coupon_code,
                "remainingPoints": current_points - cost
            })
        }

    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        return error_response(400, "Insufficient points (concurrent modification)")
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
