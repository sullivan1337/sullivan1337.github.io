# MVP Org Chart

A minimal multi-tenant organizational chart SaaS prototype built with Node.js, SQLite and D3.js.

## Features

- JWT based authentication
- Separate organizations (tenants) with their own members
- CRUD API for members and full chart retrieval
- Optional JSON import
- Tailwind powered login and dashboard

## Quick Start

1. `cd server && npm install`
2. `npm test` to verify the API works
3. `npm start`
4. Open `http://localhost:3000` in a browser
5. Login with `admin@acme.com` / `password`

Seed data includes a sample org chart for "Acme Corp".

## Elevator Pitch

Easily manage and visualize organizational charts for multiple companies. Deploy in minutes and scale features such as permissions, custom styling and integrations to monetize as a lightweight SaaS service.
