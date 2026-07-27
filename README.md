# Dental Inventory Frontend

This frontend is built with React, Vite, and React Router. It provides the UI for the dental inventory management workflow, including dashboard views, student details, issued items, and exchange tracking.

## Getting started

1. Install dependencies
   `ash
   npm install
   `
2. Start the development server
   `ash
   npm run dev
   `
3. Open the local Vite URL shown in the terminal.

## Project structure

`	ext
Frontend/
+-- public/                  # Static assets
+-- src/
¦   +-- App.jsx              # Main route definitions
¦   +-- main.jsx             # App entry point
¦   +-- index.css            # Global styles
¦   +-- App.css              # App-level styles
¦   +-- components/          # Reusable UI components
¦   ¦   +-- Layout.jsx       # Shared layout wrapper
¦   ¦   +-- Sidebar.jsx      # Sidebar navigation
¦   ¦   +-- Topbar.jsx       # Top navigation bar
¦   ¦   +-- dashboard/       # Dashboard widgets/cards/charts
¦   ¦   +-- issued/          # Issued item modals and related UI
¦   ¦   +-- student-details/ # Student form/modals/import UI
¦   ¦   +-- track-exchange/  # Exchange tracking modals
¦   +-- data/                # Static/mock data files
¦   ¦   +-- dashboardData.js
¦   ¦   +-- exchangeData.js
¦   ¦   +-- issuedData.js
¦   ¦   +-- studentData.js
¦   +-- pages/               # Route-level pages
¦   ¦   +-- Landing.jsx
¦   ¦   +-- Dashboard.jsx
¦   ¦   +-- IssuedItems.jsx
¦   ¦   +-- StudentDetails.jsx
¦   ¦   +-- TrackExchange.jsx
¦   ¦   +-- ComingSoon.jsx   # Placeholder page for unfinished features
¦   +-- utils/               # Helper utilities
¦       +-- csv.js
+-- package.json
`

## App flow

- [src/main.jsx](src/main.jsx) mounts the React app.
- [src/App.jsx](src/App.jsx) defines the route structure and wires each page to the correct path.
- [src/components/Layout.jsx](src/components/Layout.jsx) wraps pages with the shared sidebar and topbar UI.
- Each page in [src/pages](src/pages) can use components from [src/components](src/components) and data from [src/data](src/data).

## Routing overview

The app currently uses these main routes:

- / ? Landing page
- /dashboard ? Dashboard
- /students ? Student details
- /issued ? Issued items
- /Track-exchange ? Track exchange

The following routes are intentionally mapped to the Coming Soon page because those features are not fully implemented yet:

- /stock
- /failed-inventory
- /stock-insertion
- /inventory-updation
- /stock-deletion
- /settings
- /staff-manager
- /coming-soon

## Contributor notes

- Add new pages under [src/pages](src/pages).
- Add reusable UI elements under [src/components](src/components).
- Keep static/mock data in [src/data](src/data).
- When a feature is not ready yet, use the Coming Soon page in [src/pages/ComingSoon.jsx](src/pages/ComingSoon.jsx) and register it in [src/App.jsx](src/App.jsx).