# ded-char-sheet

This is a FastAPI application that serves a simple character sheet for a D&D-like game.

## Database

The application uses SQLAlchemy and `databases` to connect to a relational database. It is configured to use SQLite for local development and MariaDB for production.

### Environment Variables

The database connection is configured using environment variables. You can find a template for the required variables in the `.env.example` file.

-   `DATABASE_URL`: The connection string for the database.
    -   For SQLite (local development): `DATABASE_URL=sqlite:///./test.db`
    -   For MariaDB (production): `DATABASE_URL=mysql://user:password@mariadb/db`

## Running the Application

1.  **Install dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

2.  **Create a `.env` file:**

    Copy the `.env.example` file to `.env` and configure the `DATABASE_URL` for your environment.

    ```bash
    cp .env.example .env
    ```

3.  **Run the application:**

    ```bash
    uvicorn app.main:app --reload
    ```

## Docker

The application is intended to be run with Docker in production. A `docker-compose.yml` file will be provided to run the application with a MariaDB database.