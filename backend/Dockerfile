# Use official Python runtime as a parent image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Expose port 8000 for FastAPI
EXPOSE 8000

# Command to run the application (bind to 0.0.0.0 so it's accessible outside the container)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]