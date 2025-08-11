# ded-char-sheet

This is a FastAPI application that serves a simple character sheet for a D&D-like game.

## Database

The application uses MongoDB as its database, accessed via the `motor` asynchronous driver. It is configured to use a local MongoDB instance for development and can be pointed to a cloud-hosted instance (like MongoDB Atlas) for production.

### Environment Variables

The database connection is configured using environment variables. You can find a template for the required variables in the `.env.example` file.

-   `MONGODB_URL`: The connection string for the MongoDB server.
-   `MONGO_INITDB_DATABASE`: The name of the database to use.

### Running the Application

1.  **Set up MongoDB:**

    For local development, you can run a MongoDB instance using Docker:
    ```bash
    docker run --name some-mongo -p 27017:27017 -d mongo
    ```

2.  **Install dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

3.  **Create a `.env` file:**

    Copy the `.env.example` file to `.env`. The default values are configured for the local Docker setup.

    ```bash
    cp .env.example .env
    ```

4.  **Run the application:**

    ```bash
    uvicorn app.main:app --reload
    ```

## Docker

The application is intended to be run with Docker in production. A `docker-compose.yml` file will be provided to run the application with a MongoDB database.