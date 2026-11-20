# Secure Notes Frontend

React and Vite frontend for the Secure Notes interview task.

## Live application

- Frontend: https://secure-notes-zia.netlify.app
- API readiness: https://note-api.51-75-162-34.sslip.io/api/ready

## Features

- Registration with password confirmation and email validation
- Login with numeric username or email
- Private note management
- Public post browsing and authoring
- Administrator screens for users, interest groups, roles, and permissions
- Responsive, centered authentication screens with no logo dependency

## Local development

Requirements: Node.js 22 or newer.

```bash
npm ci
cp .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` in `.env` to the backend API prefix. For example:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_BACKEND_PENDING=false
```

## Production build

```bash
npm ci
npm run build
```

Deploy the generated `dist` directory to Netlify or Vercel. Vite embeds environment values during the build, so rebuild after changing the API URL.

The backend is maintained separately in [secure-notes-backend](https://github.com/zia11004/secure-notes-backend).
