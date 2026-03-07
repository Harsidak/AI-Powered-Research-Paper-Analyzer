import requests

pdf_path = r"c:/Users/Banwa/Desktop/IWT/CODING/PROJECTS/AI-Powered-Research-Paper-Analyzer/data/Shazad.pdf"
url = "http://localhost:8000/api/v1/analyze-sync"

print(f"Uploading {pdf_path} to {url} ...")
with open(pdf_path, 'rb') as f:
    files = {'file': ('Shazad.pdf', f, 'application/pdf')}
    response = requests.post(url, files=files)

print(f"Status Code: {response.status_code}")
try:
    print("Response JSON:")
    import json
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print("Failed to decode JSON response:", e)
    print("Raw text:", response.text)
