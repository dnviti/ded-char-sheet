# Use the latest Python 3.13 slim image as a parent image
FROM python:3.13-slim

# Set the working directory in the container
WORKDIR /app

# Add the app directory to the PYTHONPATH
ENV PYTHONPATH "${PYTHONPATH}:/app"

# Create a non-root user and group for the application
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin -c "Docker image user" appuser

# Copy the dependencies file and install them as root to leverage layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

# Change the ownership of the application directory to the non-root user
RUN chown -R appuser:appuser ./

# Switch to the non-root user
USER appuser

# Expose the port the app runs on (ports > 1024 do not require root privileges)
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]