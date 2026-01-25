# AI Endpoints

## POST /api/ai/chat

Request body:
```json
{
  "message": "string",
  "sessionId": "string (optional)"
}
```

Behavior:
- The server issues the session id. If the client does not send a sessionId or it is unknown, a new session is created.
- The response includes `sessionId` to use for subsequent messages.

Response body (success):
```json
{
  "success": true,
  "data": {
    "sessionId": "string",
    "message": "string",
    "type": "string",
    "shouldCreateTicket": true,
    "relatedSolutions": [],
    "metadata": {}
  }
}
```
