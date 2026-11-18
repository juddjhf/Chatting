# Private Group Chat Frontend

React + Vite frontend for the private group chat API. It expects a separately deployed backend that implements the endpoints and Socket.IO event names listed below.

The backend in this project is documented in [backend/README.md](./backend/README.md).

## Run locally

```bash
npm install
copy .env.example .env
npm run dev
```

Set `VITE_API_URL` to the backend origin (for example `https://your-api.onrender.com`), not to its `/api` path. The backend must allow the frontend origin in both Express CORS and Socket.IO CORS.

## Render static-site deployment

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Add `VITE_API_URL` as a build environment variable with the deployed backend origin.
- Add an SPA rewrite from `/*` to `/index.html` so `/chat/:groupCode` can be loaded directly.

## API contract

The client uses bearer-token authentication. Create and join responses must include `token`, `groupCode`, and group information; include the authenticated `member` (id, nickname, role) for accurate admin/member controls:

- `POST /api/groups/create` — `{ groupName, password }`
- `POST /api/groups/join` — `{ nickname?, groupCode, password }`
- `GET /api/groups/:groupCode`
- `GET /api/groups/:groupCode/members`
- `POST /api/groups/:groupCode/leave`
- `DELETE /api/groups/:groupCode`
- `DELETE /api/groups/:groupCode/members/:memberId`
- `GET /api/messages/:groupCode?page=1&limit=30`
- `POST /api/messages` — `{ groupCode, messageType, text?, fileUrl?, fileName?, fileSize?, mimeType?, replyTo? }`
- `DELETE /api/messages/:messageId`
- `POST /api/upload` — multipart fields `file` and `groupCode`; returns `fileUrl` and file metadata.

Responses may be wrapped in a `data` property. History returns either an array or `{ messages, hasMore }`.

The Socket.IO server authenticates `auth.token` and supports `join_group`, `leave_group`, `typing_start`, `typing_stop`, then emits `new_message`, `member_joined`, `member_left`, `online_members`, `user_typing`, `user_stopped_typing`, and `message_deleted`. The message API should publish `new_message` after saving so HTTP message submission appears instantly to other connected members. The server remains responsible for authorization and room isolation.

The session token is held in `sessionStorage` (not `localStorage`); group passwords are not persisted.
