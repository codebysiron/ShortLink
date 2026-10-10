# ShortLink — URL Shortener

A URL shortener built with **FastAPI, PostgreSQL, Redis, and Docker**.
ShortLink converts long URLs into compact links and provides click tracking
and URL statistics through a simple web interface.

## Live Demo

**Live Application:** https://url-shortener-itl2.onrender.com

**GitHub Repository:** https://github.com/codebysiron/ShortLink

---

## Features

- **URL Shortening:** Generate short codes for long URLs.
- **URL Redirection:** Redirect users to the original destination.
- **Click Tracking:** Record clicks on shortened URLs.
- **URL Statistics:** Retrieve click statistics for individual links.
- **Expiration Support:** Set an optional expiration period for URLs.
- **Redis Caching:** Cache URL data to reduce repeated database lookups.
- **PostgreSQL Storage:** Persist URLs and click statistics.
- **REST API:** Access functionality through HTTP endpoints.
- **Web Interface:** Interact with the application through a simple frontend.
- **Docker Support:** Containerize the application for deployment.

## Tech Stack

| Technology | Purpose |
|---|---|
| Python | Backend programming |
| FastAPI | REST API development |
| SQLAlchemy | Database interaction |
| PostgreSQL | Persistent data storage |
| Redis | URL caching |
| Pydantic | Configuration and data validation |
| HTML | Frontend structure |
| CSS | Frontend styling |
| JavaScript | Frontend interactions |
| Docker | Containerization |
| Render | Application hosting |

## Architecture

1. The user submits a long URL through the web interface.
2. FastAPI validates the request and generates a short code.
3. PostgreSQL stores the URL and its associated information.
4. Redis caches URL data when available.
5. When someone opens a short link, the application resolves
   the short code and redirects to the original URL.
6. Click information is stored in PostgreSQL and exposed through
   the statistics endpoint.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/shorten` | Create a shortened URL |
| `GET` | `/redirect/{short_code}` | Redirect to the original URL |
| `GET` | `/stats/{short_code}` | Retrieve URL statistics |

### API Documentation

Interactive API documentation is available at:

https://url-shortener-itl2.onrender.com/docs

## Run Locally

### Prerequisites

- Python 3.11 or later
- Docker Desktop
- Git

### 1. Clone the repository

```bash
git clone https://github.com/codebysiron/ShortLink.git
cd ShortLink
