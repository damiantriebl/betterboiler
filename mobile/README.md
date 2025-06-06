# Better Mobile

A simple React Native (Expo) app that connects to the existing Next.js backend.
The app reuses the same server actions through HTTP requests so you can share
Prisma models and business logic. Every top level page from the web version has
a matching placeholder screen so navigation feels familiar on mobile.

## Running the App

```bash
pnpm install
yarn install # or npm install if you prefer
pnpm android      # open on Android emulator or device
```

Make sure the Next.js backend is running (`pnpm dev`) so the app can fetch data
from the same actions.
