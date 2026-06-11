#!/usr/bin/env python3

import os
from openai import OpenAI

API_KEY = os.getenv("OPENROUTER_API_KEY")

if not API_KEY:
    print("ERROR: OPENROUTER_API_KEY not set")
    print("Run:")
    print('export OPENROUTER_API_KEY="your-key"')
    exit(1)

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=API_KEY
)

SYSTEM_PROMPT = """
You are a DevOps Engineer specialized in:
- Kubernetes
- Amazon EKS
- Docker
- Helm
- ArgoCD
- Datadog
- GitHub Actions
- CI/CD
"""

while True:

    question = input("\nYou > ")

    if question.lower() in ["exit", "quit", "q"]:
        break

    response = client.chat.completions.create(
        model="meta-llama/llama-3.3-70b-instruct",
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": question
            }
        ]
    )

    print("\nAgent >")
    print(response.choices[0].message.content)
