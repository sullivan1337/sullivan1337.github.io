document.getElementById("generated-form").addEventListener("submit", (event) => {
    event.preventDefault();
    generatePythonScript();
  });
  
  document.getElementById("copy-python").addEventListener("click", () => {
    const pythonOutput = document.getElementById("python-output");
    const range = document.createRange();
    range.selectNode(pythonOutput);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand("copy");
    window.getSelection().removeAllRanges();
  });
  
  function generate_python_script() {
    const clientId = document.getElementById("client-id").value;
    const clientSecret = document.getElementById("client-secret").value;
    const authUrl = document.getElementById("auth-url").value;
    const endpointUrl = document.getElementById("endpoint-url").value;
    const audience = document.getElementById("audience").value;
    const graphqlQuery = document.getElementById("graphql-query").value;
    const graphqlVariables = document.getElementById("graphql-variables").value;

    const python_script = `
import requests
import json

def get_access_token(client_id, client_secret, auth_url, audience):
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "audience": audience,
        "grant_type": "client_credentials"
    }
    headers = {"content-type": "application/json"}
    response = requests.post(auth_url, data=json.dumps(payload), headers=headers)
    return response.json()["access_token"]

def run_graphql_query(query, variables):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }
    payload = {
        "query": query,
        "variables": variables
    }
    response = requests.post(endpoint_url, json=payload, headers=headers)
    return response.json()

client_id = "${clientId}"
client_secret = "${clientSecret}"
auth_url = "${authUrl}"
endpoint_url = "${endpointUrl}"
audience = "${audience}"
access_token = get_access_token(client_id, client_secret, auth_url, audience)

query = """${graphqlQuery.replace(/(\r\n|\n|\r)/gm, " ")}"""
variables = ${graphqlVariables}

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

print(json.dumps(all_data, indent=2))`;

    document.getElementById("python-output").textContent = python_script.trim();
}
