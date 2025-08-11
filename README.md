# D&D Character Sheet Manager

This is a web-based Dungeons & Dragons 5th Edition character sheet manager. It provides a user-friendly interface for creating, editing, and managing your D&D characters. The application is built with a FastAPI backend and a React frontend, and it uses MongoDB for data storage.

## Features

*   **Character Creation and Management**: Create new characters from scratch, edit their stats, skills, equipment, and more.
*   **Dynamic Character Sheet**: The character sheet is interactive, allowing you to update your character's information in real-time.
*   **Open5e Integration**: The application fetches data from the [Open5e API](https://api.open5e.com/) to provide information on races, classes, spells, and more. This data is cached in the local database to improve performance.
*   **Generative AI**: The application uses the Gemini and Imagen APIs to generate character portraits, backstories, and other creative content.
*   **PDF Export**: You can export your character sheet to a PDF for printing or offline use.
*   **Responsive Design**: The application is designed to work on both desktop and mobile devices.

## Tech Stack

*   **Backend**: FastAPI, Uvicorn
*   **Frontend**: React, Jinja2
*   **Database**: MongoDB
*   **Libraries**:
    *   `motor`: Asynchronous Python driver for MongoDB.
    *   `python-dotenv`: For managing environment variables.
    *   `requests`: For making HTTP requests to the Open5e API.
    *   `APScheduler`: For scheduling the Open5e data caching job.

## Setup and Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Create a virtual environment**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

3.  **Install the dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up the environment variables**:
    Create a `.env` file in the root of the project by copying the `.env.example` file:
    ```bash
    cp .env.example .env
    ```
    Update the `.env` file with your MongoDB connection details:
    ```
    MONGODB_URL=mongodb://localhost:27017
    MONGO_INITDB_DATABASE=dedchar
    ```

## Running the Application

1.  **Make sure you have a running MongoDB instance.**

2.  **Run the FastAPI server**:
    ```bash
    uvicorn app.main:app --reload
    ```
    The application will be available at `http://127.0.0.1:8000`.

3.  **Initial Data Caching**:
    On the first run, the application will automatically fetch and cache the necessary data from the Open5e API. This process might take a few minutes. The data will be refreshed automatically every day at 3:00 AM UTC. You can also trigger the caching process manually by running the following script:
    ```bash
    python -m scripts.load_open5e_data
    ```

## Environment Variables

*   `MONGODB_URL`: The connection string for your MongoDB instance.
*   `MONGO_INITDB_DATABASE`: The name of the database to use for the application.