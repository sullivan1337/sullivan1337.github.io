import requests
import time
import os
import json

AUTH_URL = "https://na0.meevo.com/onlinebooking/api/auth/ob?locationid=107231&businesstypeid=6c5a9c8f-524f-4ef4-aaad-ae0c0128aada"
MONITOR_URL = "https://na0.meevo.com/onlinebooking/api/ob/scanforopenings"
USERNAME = os.environ.get("USERNAME")
PASSWORD = os.environ.get("PASSWORD")
WEBHOOK_URL = os.environ.get("WEBHOOK_URL")

AUTH_HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'Origin': 'https://na0.meevo.com',
    'Referer': 'https://na0.meevo.com/OnlineBookingApp/login?tenantId=104085',
}

MONITOR_HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'Origin': 'https://na0.meevo.com',
    'Referer': 'https://na0.meevo.com/OnlineBookingApp/booking/date?tenantId=104085',
}

# Fill this with actual payload
DATA = {
    "scanServices": [
        {
            "clientId":"a53c4449-8dca-4c06-98f1-af2b00c49ab9",
            "serviceId":"31338c31-c2a1-4202-b413-ae760145b960",
            "employeeId":None,
            "genderPreferenceEnum":105,
            "clientFirstName":"Courtney",
            "clientLastName":"Sullivan",
            "isGuest":False,
            "customServiceStepTimings":None
        }
    ],
    "payingClientId":"a53c4449-8dca-4c06-98f1-af2b00c49ab9",
    "isRescan":False,
    "scanOrigin":1,
    "maxOpeningsPerDay":20,
    "appointmentBufferMinutes":180,
    "maxStartTimeWait":0,
    "maxWaitTimeBetweenServices":0,
    "requireSameStartTime":True,
    "requireSameResource":False,
    "scanDateType":2094,
    "scanTimeType":2099,
    "startDate":"2023-08-11T00:00:00-04:00",
    "endDate":"2023-08-11T00:00:00-04:00",
    "startTime":"1900-01-01T12:00:00-05:00",
    "endTime":"1900-01-01T18:00:00-05:00",
    "isCouplesScan":False,
    "isRestrictedToBookableOnline":True
}


def get_bearer_token():
    auth_data = {
        "UserName": USERNAME,
        "Password": PASSWORD,
    }
    auth_res = requests.post(
        AUTH_URL,
        headers=AUTH_HEADERS,
        json=auth_data
    )
    auth_res.raise_for_status()
    token = auth_res.json().get("bearerToken")
    if token:
        send_webhook("Bearer token received successfully.")
    return token


def send_webhook(message):
    data = {"text": message}
    response = requests.post(WEBHOOK_URL, json=data)
    response.raise_for_status()

def monitor_website():
    last_status = None
    while True:
        token = get_bearer_token()
        if token:
            MONITOR_HEADERS['Authorization'] = f'Bearer {token}'
            res = requests.post(MONITOR_URL, headers=MONITOR_HEADERS, json=DATA)
            new_status = "Available" if res.json() else "Not Available"
            if new_status != last_status:  # if status has changed
                send_webhook(f"Status changed to {new_status}")
                last_status = new_status  # update the last status
            print("Status code:", res.status_code)
        else:
            print("Failed to obtain bearer token.")
        time.sleep(7200)  # Sleep for 2 hours

def main():
    print("Starting the script...")
    print("Starting to monitor the website...")
    monitor_website()

if __name__ == "__main__":
    main()
