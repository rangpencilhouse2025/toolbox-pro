# ToolBox Pro - Full Stack AI Platform

This is a full-stack web application built with React (Vite), Express, and Firebase.

## Project Structure

- `/src` - Frontend React application (TypeScript, Tailwind CSS)
- `server.ts` - Backend Express server (API routes, Razorpay integration)
- `firebase.ts` - Firebase configuration and initialization
- `firestore.rules` - Security rules for the database

## Setup Instructions

1. **Clone the repository** and install dependencies:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   Create a `.env` file in the root directory and add the following (refer to `.env.example`):
   - `GEMINI_API_KEY`: Your Google Gemini API key.
   - `RAZORPAY_KEY_ID`: Your Razorpay Key ID (Frontend).
   - `RAZORPAY_SECRET`: Your Razorpay Secret Key (Backend only).
   - `APP_URL`: The URL where your app is hosted.

3. **Firebase Configuration**:
   Ensure `firebase-applet-config.json` contains your Firebase project credentials.

## Running the App

### Development Mode
Runs both the backend server and Vite dev middleware:
```bash
npm run dev
```

### Production Build
1. Build the frontend:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm start
   ```

## Deployment (Render)

This project is configured for easy deployment on Render.
1. Connect your GitHub repository to Render.
2. Create a new **Web Service**.
3. Use the following settings:
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add your environment variables in the Render dashboard.

## Security Features
- **Razorpay**: Orders are created and verified server-side using the Secret Key. The Secret Key is never exposed to the frontend.
- **Validation**: All API inputs are validated using Zod.
- **Database**: Firestore security rules enforce strict ownership and data integrity.
