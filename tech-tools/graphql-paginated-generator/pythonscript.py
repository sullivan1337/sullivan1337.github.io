import requests
import json

CLIENT_ID = "wgxq75hrlndpbktx3eupevf2xzmckf3cwg4f3jvxebde7enk3oxhg"
CLIENT_SECRET = "S0GwIPaqCOSdlJzEoUlOW0iEfGUMiDAMj1j35jpRMLIQstdyUaaW04c3ku5g6lfT"
ENDPOINT_URL = "https://api.us20.app.wiz.io/graphql"
AUTH_URL = "https://auth.app.wiz.io/oauth/token"
AUDIENCE = "wiz-api"

def get_access_token():
    payload = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "audience": AUDIENCE,
        "grant_type": "client_credentials"
    }
    response = requests.post(AUTH_URL, data=payload)
    response_json = response.json()
    access_token = response_json.get("access_token")
    return access_token

def run_graphql_query(query, variables=None, end_cursor=None):
    headers = {
        "Authorization": f"Bearer {get_access_token()}",
        "Content-Type": "application/json"
    }
    if end_cursor:
        variables["end_cursor"] = end_cursor
    payload = {
        "query": query,
        "variables": variables
    }
    response = requests.post(ENDPOINT_URL, headers=headers, data=json.dumps(payload))
    response_json = response.json()
    return response_json

query = """query CloudConfigurationSettingsTable($first: Int, $after: String, $filterBy: CloudConfigurationRuleFilters, $orderBy: CloudConfigurationRuleOrder, $projectId: [String!]) { cloudConfigurationRules(first: $first, after: $after, filterBy: $filterBy, orderBy: $orderBy) { nodes { id name description enabled severity cloudProvider subjectEntityType functionAsControl graphId opaPolicy builtin targetNativeType remediationInstructions control { id } securitySubCategories { id title description externalId category { id name description externalId framework { id name } } } analytics(selection: {projectId: $projectId}) { passCount failCount } scopeAccounts { id name cloudProvider } } pageInfo { endCursor hasNextPage } totalCount }}"""

variables = {
"first": 500,
"filterBy": {
"createdByType": [
    "BUILT_IN"
]
},
"orderBy": {
"field": "FAILED_CHECK_COUNT",
"direction": "DESC"
}
}

has_next_page = True
all_data = []

while has_next_page:
    response = run_graphql_query(query, variables)
    data = response["data"]["cloudConfigurationRules"]["nodes"]
    all_data.extend(data)
    page_info = response["data"]["cloudConfigurationRules"]["pageInfo"]
    has_next_page = page_info["hasNextPage"]
    end_cursor = page_info["endCursor"] if has_next_page else None
    if has_next_page:
        variables = {**variables, "end_cursor": end_cursor}


print(json.dumps(all_data, indent=2))