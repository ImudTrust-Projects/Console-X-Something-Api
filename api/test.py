import requests
import json

base_url = "https://liquid-client-api.vercel.app"

print("=== GET /usercount ===")
get_response = requests.get(f"{base_url}/usercount")
print(f"Status: {get_response.status_code}")
print(f"Users online: {get_response.json()}")
print()

print("=== POST /usercount ===")
data = {"userid": "A997F8331FE24A33"}
post_response = requests.post(f"{base_url}/usercount", json=data)
print(f"Status: {post_response.status_code}")
print(f"Response: {post_response.json()}")
print()

print("=== GET /usercount (after POST) ===")
get_response2 = requests.get(f"{base_url}/usercount")
print(f"Users online: {get_response2.json()}")
print()

print("=== POST /checkuser ===")
check_data = {
    "userid": "A997F8331FE24A33",
    "identity": "tet"
}
check_response = requests.post(f"{base_url}/checkuser", json=check_data)
print(f"Status: {check_response.status_code}")
print(f"Response: {check_response.json()}")