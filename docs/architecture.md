# Architecture

```txt
Next.js Frontend
  -> Firebase Authentication
  -> FastAPI Backend
  -> Portfolio Engine
  -> Simulation Engine
  -> Firestore Database
```

The starter code keeps portfolio and simulation operations stateless so the product can run locally before Firestore writes are enabled. Firebase token verification is already isolated in `backend/app/firebase_admin.py`, which is the integration point for production authentication.
