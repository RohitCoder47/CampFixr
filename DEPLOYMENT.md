# Deploy CampFixr

GitHub Pages only serves static files. CampFixr login, complaints, and notices require the Express API and MongoDB, so deploy this repository as a Docker web service and use that service's URL (not the GitHub Pages URL).

## Render deployment

1. Create a MongoDB Atlas database and allow the hosting service to connect. Keep the database username/password private.
2. In Render, create a **New Web Service**, connect the `rohitcoder47/CampFixr` repository, and choose **Docker** as the runtime.
3. Add these environment variables in the Render service settings:
   - `MONGODB_URI`: your Atlas connection string
   - `JWT_SECRET`: a unique, long random secret
   - `ADMIN_SETUP_KEY`: another unique secret used by the admin setup flow
4. Deploy. Render builds the C++ complaint processor in Linux and starts the Node server using the port provided by the host.
5. Open the `onrender.com` service URL and test sign-in there. The old `rohitcoder47.github.io/CampFixr/` link is static-only and cannot run login/API requests.

Do not put real credentials in GitHub, this file, or chat. Do not upload `.env`, `node_modules`, or the Windows `complaint_processor.exe` file. The Linux executable is compiled during the Docker build.

## Local development

Keep a local `.env` file with the three variables above, install dependencies with `npm install`, and run `npm start`. On Windows, keep the compiled `complaint_processor.exe` beside `server.js`.
