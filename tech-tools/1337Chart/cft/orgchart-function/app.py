import os
import json
import uuid
import urllib.request
import urllib.parse
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
secrets_client = boto3.client('secretsmanager')

TABLE_NAME = os.environ.get('TABLE_NAME')
SECRET_ARN = os.environ.get('SECRET_ARN')
REDIRECT_URI = os.environ.get('REDIRECT_URI')

org_table = dynamodb.Table(TABLE_NAME)

def lambda_handler(event, context):
    # Enable CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return _response(200, {})

    try:
        path = event.get('path', '')
        method = event.get('httpMethod', '')
        if path.endswith('/auth') and method == 'POST':
            body = json.loads(event.get('body', '{}'))
            code = body.get('code')
            code_verifier = body.get('codeVerifier')
            if not code or not code_verifier:
                return _response(400, {"error": "Missing code or codeVerifier"})
            # Get LinkedIn credentials from Secrets Manager
            secret_value = secrets_client.get_secret_value(SecretId=SECRET_ARN)
            creds = json.loads(secret_value['SecretString'])
            client_id = creds.get("client_id")
            client_secret = creds.get("client_secret")
            token_url = "https://www.linkedin.com/oauth/v2/accessToken"
            data = urllib.parse.urlencode({
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": REDIRECT_URI,
                "client_id": client_id,
                "client_secret": client_secret,
                "code_verifier": code_verifier
            }).encode('utf-8')
            req = urllib.request.Request(token_url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"})
            with urllib.request.urlopen(req) as resp:
                token_info = json.loads(resp.read().decode())
            access_token = token_info.get("access_token")
            if not access_token:
                return _response(500, {"error": "Access token not received"})
            # Fetch user profile from LinkedIn
            profile_url = "https://api.linkedin.com/v2/me"
            req = urllib.request.Request(profile_url, headers={"Authorization": f"Bearer {access_token}"})
            with urllib.request.urlopen(req) as resp:
                profile = json.loads(resp.read().decode())
            user_id = profile.get("id")
            first_name = profile.get("localizedFirstName", "")
            last_name = profile.get("localizedLastName", "")
            full_name = (first_name + " " + last_name).strip() or "LinkedIn User"
            # Create a root org chart node for this user if not exists
            try:
                r = org_table.get_item(Key={"UserId": user_id, "NodeId": "ROOT"})
            except Exception as e:
                print("Error fetching root:", e)
                return _response(500, {"error": "Database error"})
            if 'Item' not in r:
                root_item = {"UserId": user_id, "NodeId": "ROOT", "Name": full_name, "Title": ""}
                org_table.put_item(Item=root_item)
            return _response(200, {"status": "ok", "user": {"id": user_id, "name": full_name}})
        elif path.endswith('/orgchart'):
            user_id = None
            if event.get('httpMethod') == 'GET':
                user_id = event.get('queryStringParameters', {}).get('userId')
                if not user_id:
                    return _response(400, {"error": "Missing userId"})
                result = org_table.query(
                    KeyConditionExpression=Key('UserId').eq(user_id)
                )
                items = result.get('Items', [])
                return _response(200, items)
            elif event.get('httpMethod') in ['POST','PUT']:
                body = json.loads(event.get('body', '{}'))
                user_id = body.get('userId')
                name = body.get('name')
                title = body.get('title')
                parent_id = body.get('parentId', "ROOT")
                if not user_id or not name or not title:
                    return _response(400, {"error": "Missing required fields"})
                node_id = str(uuid.uuid4())
                item = {
                    "UserId": user_id,
                    "NodeId": node_id,
                    "Name": name,
                    "Title": title,
                    "ParentId": parent_id
                }
                org_table.put_item(Item=item)
                return _response(200, {"status": "ok", "nodeId": node_id})
        return _response(404, {"error": "Not found"})
    except Exception as e:
        print("Unexpected error:", e)
        return _response(500, {"error": "Internal error"})

def _response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        "body": json.dumps(body)
    }
