# Agent Instructions for D&D Character Sheet Manager

This document provides instructions for AI agents working on this codebase.

## Project Overview

This is a web application for managing Dungeons & Dragons 5th Edition character sheets. It consists of:

*   **A FastAPI backend**: Located in the `app` directory. It serves a REST API for managing character data.
*   **A React frontend**: Located in `app/static/js/app.jsx`. It provides the user interface for the character sheet.
*   **A MongoDB database**: Used for storing character data.
*   **A data caching script**: Located in `scripts/load_open5e_data.py`. It fetches data from the Open5e API and caches it in the MongoDB database.

## Getting Started

1.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Set up environment variables**:
    Copy the `.env.example` file to `.env` and ensure the MongoDB connection details are correct.
    ```bash
    cp .env.example .env
    ```
    The application requires a running MongoDB instance.

## Running the Application

To run the backend server for development, use the following command:

```bash
uvicorn app.main:app --reload
```

The application will be available at `http://127.0.0.1:8000`.

The first time you run the application, it will automatically cache data from the Open5e API. This might take a few minutes.

## Project Structure

*   `app/`: Contains the main FastAPI application.
    *   `main.py`: The main entry point for the FastAPI application.
    *   `db.py`: Handles the MongoDB database connection.
    *   `static/`: Contains the static assets for the frontend.
        *   `js/app.jsx`: The main React component for the frontend.
        *   `css/styles.css`: The stylesheet for the application.
    *   `templates/`: Contains the Jinja2 templates.
        *   `index.html`: The main HTML file that loads the React application.
*   `scripts/`: Contains helper scripts.
    *   `load_open5e_data.py`: The script for caching data from the Open5e API.
*   `requirements.txt`: The Python dependencies for the project.
*   `.env.example`: An example of the environment variables required to run the application.

## Frontend Development

The frontend is a React application written in a single JSX file (`app/static/js/app.jsx`). Any changes to the frontend should be made in this file. The application uses a simple setup where the JSX file is transpiled by the browser. There is no build step for the frontend.

## Database

The application uses MongoDB. Make sure you have a running MongoDB instance that the application can connect to, as specified in your `.env` file. The application creates two types of collections:
*   `characters`: Stores the character sheets created by users.
*   `open5e_*`: A set of collections that cache data from the Open5e API (e.g., `open5e_spells`, `open5e_classes`).
