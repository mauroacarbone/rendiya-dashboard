# RendiYa Admin Dashboard

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-blue)

Web interface for **RendiYa**, a booking platform for driving-test vehicles in Greater Buenos Aires. This dashboard authenticates against the REST API, stores a JWT, and manages reservations end to end.

## Tech Stack

- **React**
- **Vite**
- **React Router DOM**
- **Tailwind CSS**
- **Axios**
- **Lucide React**

## Features

- **JWT authentication flow** — register and sign in through `/auth/register` and `/auth/login`.
- **Token persistence** — the session JWT is stored locally and sent as `Authorization: Bearer`.
- **Protected routes** — reservation screens are available only after a valid session.
- **Reservations CRUD**
  - `GET` list reservations
  - `POST` create a reservation
  - `PUT` update status (confirm / cancel)
  - `DELETE` remove a reservation

## Environment Setup

1. Copy the example env file:

   ```bash
   cp .env.example .env.local
   ```

2. Set the API base URL in `.env.local`:

   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

3. Install dependencies and start the dev server:

   ```bash
   npm install
   npm run dev
   ```

The app is served at `http://localhost:5173`.

## Backend Requirement

This frontend consumes **rendiya-api**. Clone, configure, and run the API before using the dashboard:

[https://github.com/mauroacarbone/rendiya-api](https://github.com/mauroacarbone/rendiya-api)

The API must be available at `http://localhost:3001` (MySQL + JWT secret as documented in that repository).

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Start Vite in development |
| `npm run build`| Production build          |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint               |
