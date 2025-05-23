# Logger Microservice

A centralized logging service that stores error logs from various microservices in a MongoDB database.

## Features

- Store logs with different severity levels (error, warn, info, debug)
- Query logs with filters (service, level, date range)
- Persistent storage in MongoDB
- Winston logging integration
- RESTful API endpoints

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the root directory with the following variables:

```
PORT=3005
MONGODB_URI=mongodb://localhost:27017/logger
LOG_LEVEL=info
```

3. Build the TypeScript code:

```bash
npm run build
```

4. Start the service:

```bash
npm start
```

## API Endpoints

### POST /api/logs

Create a new log entry.

Request body:

```json
{
  "service": "service-name",
  "level": "error",
  "message": "Error message",
  "metadata": {
    "additionalInfo": "value"
  }
}
```

### GET /api/logs

Get logs with optional filters.

Query parameters:

- `service`: Filter by service name
- `level`: Filter by log level
- `startDate`: Filter logs after this date
- `endDate`: Filter logs before this date
- `limit`: Maximum number of logs to return (default: 100)

## Example Usage

```typescript
// Example of sending a log from another service
const logError = async (error: Error) => {
  try {
    await fetch("http://localhost:3005/api/logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service: "user-service",
        level: "error",
        message: error.message,
        metadata: {
          stack: error.stack,
        },
      }),
    });
  } catch (err) {
    console.error("Failed to send error log:", err);
  }
};
```
