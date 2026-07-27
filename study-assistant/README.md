# AI Study Assistant

An AWS-deployable AI-powered study assistant that generates interactive quizzes, summarizes uploaded PDF study materials, and hosts an intelligent chatbot using the Gemini API.

## Features
- **Quiz Generator**: Generates customized multiple-choice questions on any topic in real-time.
- **PDF Summarizer**: Extracts text from uploaded PDFs and provides structured summaries.
- **AI Tutor Chatbot**: Stateful chat interface for asking academic questions and learning.

---

## Local Development

### Prerequisites
- Python 3.10+
- A Gemini API Key (Obtain from [Google AI Studio](https://aistudio.google.com/))

### Method 1: Local Python Setup

1. Navigate to the project root directory.
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
4. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
   Add your `GEMINI_API_KEY` to the `.env` file.
5. Run the application:
   ```bash
   python backend/app.py
   ```
6. Open your browser and navigate to `http://localhost:8000`.

### Method 2: Docker Compose

1. Build and start the container:
   ```bash
   docker-compose up --build
   ```
2. The application will be live at `http://localhost:8000`.

---

## AWS Deployment Guide

This application is designed to be easily deployed to AWS. Here are the three best methods:

### Option 1: AWS App Runner (Recommended - Simplest & Managed)
AWS App Runner is a fully managed service that makes it easy to build, deploy, and run containerized web applications.

1. Push your code to a private GitHub repository.
2. In the AWS Console, search for **AWS App Runner** and click **Create service**.
3. Select **Source code repository**, connect your GitHub account, and choose your repository and branch.
4. In **Deployment settings**, choose **Automatic**.
5. In **Configure build**:
   - Choose **Virtual machine** / **Runtime: Docker**.
6. In **Configure service**:
   - Port: `8000`
   - Under **Environment variables**, add:
     - Name: `GEMINI_API_KEY` | Value: `(Your Gemini API Key)`
7. Click **Create & Deploy**. AWS will build the Docker container and give you a public URL.

### Option 2: AWS ECS (Elastic Container Service) with Fargate
Best for enterprise setups or when integrating with existing AWS VPC networks.

1. Build and push the Docker image to **AWS ECR (Elastic Container Registry)**.
2. Create an **ECS Cluster** (using AWS Fargate serverless infrastructure).
3. Create a **Task Definition** specifying:
   - Container Port: `8000`
   - Environment variable: `GEMINI_API_KEY`
   - CPU/Memory allocations (e.g., 0.5 vCPU and 1 GB memory).
4. Run the Task as a **Service** with an **Application Load Balancer (ALB)** to handle public traffic and certificate management.

### Option 3: AWS Elastic Beanstalk
Best if you want a classic web server setup on EC2 with auto-scaling.

1. Install the Elastic Beanstalk CLI (`eb`).
2. Initialize EB: `eb init -p docker study-assistant`.
3. Create environment: `eb create study-assistant-env`.
4. Configure environment properties in the AWS Console to add `GEMINI_API_KEY`.
5. Deploy future updates with `eb deploy`.
