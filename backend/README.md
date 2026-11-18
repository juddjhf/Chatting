# Private Group Chat API

Express, MongoDB, and Socket.IO backend for the frontend in the project root.
The API uses JWT group sessions, bcrypt-hashed group passwords, and private
Cloudinary uploads streamed through an authenticated API endpoint.

## Local setup

Requirements: Node.js 20 or newer, MongoDB Atlas (or another replica set),
and a Cloudinary account.

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm start
```

Set the values in `.env` before starting the server. `MONGODB_URI` must point
to a replica set because message and group operations use MongoDB transactions.
Use a unique, random `JWT_SECRET` with at least 32 characters. Cloudinary
credentials are required for uploads; do not commit `.env`.

The API listens on `PORT` (default `5000`). `GET /api/health` reports whether
the server and database are ready.

## Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port |
| `NODE_ENV` | Runtime environment |
| `MONGODB_URI` | MongoDB replica-set connection string |
| `JWT_SECRET` | Secret used to sign group session tokens |
| `JWT_EXPIRES_IN` | Session lifetime, for example `7d` |
| `FRONTEND_URL` | Allowed frontend origin; comma-separate multiple origins |
| `API_PUBLIC_URL` | Public backend origin used when constructing protected upload URLs |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `MAX_FILE_SIZE_MB` | Maximum upload size (default `50`) |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window in milliseconds |
| `RATE_LIMIT_MAX` | General API requests per window |
| `AUTH_RATE_LIMIT_MAX` | Create/join/logout requests per window |
| `UPLOAD_RATE_LIMIT_MAX` | Upload requests per window |
| `TRUST_PROXY` | Express proxy trust setting; use `1` on Render |

## REST API

Authenticated routes accept `Authorization: Bearer <token>` or the secure,
HttpOnly `group_session` cookie. Create and join return a token and set the
cookie. Passwords and password hashes are never returned. Successful responses
use `{ success, message, data }`; errors use `{ success: false, message, code }`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/groups/create` | Create a group with `{ groupName, password }`; creator is admin |
| `POST` | `/api/groups/join` | Join with `{ groupCode, password, nickname? }` |
| `GET` | `/api/auth/me` | Read current group and member session |
| `POST` | `/api/auth/logout` | Revoke the current group session |
| `GET` | `/api/groups/me` | Get current group and member |
| `GET` | `/api/groups/:groupCode` | Get group details |
| `GET` | `/api/groups/:groupCode/members` | List group members |
| `POST` | `/api/groups/:groupCode/leave` | Leave the current group |
| `DELETE` | `/api/groups/:groupCode/members/:memberId` | Admin removes a member |
| `DELETE` | `/api/groups/:groupCode` | Admin deletes the group |
| `GET` | `/api/messages/:groupCode?page=1&limit=30` | Read paginated message history |
| `POST` | `/api/messages` | Send a message in the authenticated group |
| `POST` | `/api/messages/:messageId/reply` | Reply to a message |
| `DELETE` | `/api/messages/:messageId` | Delete own message, or any message as admin |
| `POST` | `/api/upload` | Upload multipart field `file` to the authenticated group |
| `GET` | `/api/upload/:uploadId/content` | Stream an attached file to an authorized member |

The upload endpoint also accepts `/api/uploads`. A message may be text or an
uploaded attachment; attachment messages must reference an upload returned by
`POST /api/upload`. History is returned in chronological order with pagination
metadata. Supported files are JPG/JPEG, PNG, WEBP, MP4, WEBM, MOV, PDF, DOC,
DOCX, XLS, XLSX, TXT, PPT, and PPTX, subject to the configured size limit.
Uploads are checked by extension, MIME type, and file signature where
applicable. Cloudinary stores the file privately; group membership is checked
before the API streams it.

All group and message endpoints authorize against the group in the current
session. Admin operations are also enforced on the server. Removing a member,
leaving, or deleting a group revokes access and disconnects affected sockets.

## Socket.IO

Connect to the backend origin with `auth: { token: "<group-session-token>" }`.
After connection, emit `join_group` (optionally including `groupCode`); the
server derives the room from the authenticated session and verifies the active
membership. Message sending derives sender identity on the server.

Client events: `join_group`, `leave_group`, `send_message`, `typing_start`,
`typing_stop`, `delete_message`.

Server events: `new_message`, `member_joined`, `member_left`,
`online_members`, `user_typing`, `user_stopped_typing`, `message_deleted`,
`member_removed`, `group_deleted`.

Message and deletion requests can use acknowledgement callbacks. Presence is
maintained in process memory; use a Socket.IO Redis adapter and shared presence
store before running multiple backend instances.

## Tests

```powershell
npm test
```

Integration tests run against a temporary MongoDB replica set and cover group
sessions, authorization, message history/deletion, uploads, and Socket.IO room
isolation. They use the cached MongoDB 7.0.14 x64 test binary.

## Render deployment

Create a Web Service with `backend` as its Root Directory:

- Build command: `npm install`
- Start command: `npm start`
- Add the environment variables from `.env.example` in the Render dashboard.
- Set `NODE_ENV=production`, `TRUST_PROXY=1`, `FRONTEND_URL` to the deployed
  frontend origin, and `API_PUBLIC_URL` to this service's public origin.
- Set `MONGODB_URI` to a MongoDB Atlas replica-set URI and configure Atlas
  network access for Render.
- Configure the Cloudinary credentials. Do not expose them in frontend
  variables or commit them to the repository.

The frontend is deployed separately as a Render Static Site from the project
root (`npm ci && npm run build`, publish directory `dist`) with
`VITE_API_URL` set to the backend origin and an SPA rewrite to `/index.html`.
Allow that exact frontend origin in `FRONTEND_URL`. Socket.IO CORS uses the
same configured origins.

## Structure

```text
backend/
  src/
    config/       Database, Cloudinary, environment, Socket.IO configuration
    controllers/  HTTP request handlers
    middleware/   Authentication, authorization, validation, upload, errors
    models/       Group, member, message, and upload schemas
    routes/       Auth, group, message, upload, and admin endpoints
    services/     Database and notification operations
    sockets/      Socket authentication and event handlers
    utils/        Responses, tokens, serialization, and file helpers
    validators/   Request and uploaded-file validation
  tests/          Integration tests and MongoDB test setup
```
