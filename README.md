# CampFixr

CampFixr is a campus complaint portal. Students can create accounts, submit and track complaints, and see notices. Staff can review and update complaint status. The Express API stores accounts and complaints in MongoDB. A C++ command-line processor supports complaint analysis, priority ranking, duplicate checks, and statistics.

## Technology

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js and Express
- Database: MongoDB with Mongoose
- Complaint processing: C++17

## Run locally

1. Install Node.js and a C++ compiler.
2. Copy `.env.example` to `.env` and set `MONGODB_URI`, `JWT_SECRET`, and `ADMIN_SETUP_KEY`.
3. Install dependencies with `npm install`.
4. Compile the processor on Windows: `g++ -std=c++17 -O2 -o complaint_processor.exe complaint_processor.cpp`.
5. Start the app with `npm start`, then open `http://localhost:3000`.

## Deploy

GitHub Pages cannot run the Express API or C++ processor. Deploy the repository as a Docker web service and configure the three environment variables privately in the hosting provider. The included [deployment guide](DEPLOYMENT.md) describes the Render setup. The Docker build compiles the C++ processor for Linux and starts the API on the port assigned by the host.

Never commit `.env`, database credentials, or other secrets. The `.gitignore` excludes local secrets, dependencies, and compiled executables.
