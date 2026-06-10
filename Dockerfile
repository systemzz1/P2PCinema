FROM node:22-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application source code
COPY . .

# Set default environment variables
ENV PORT=3636
ENV NODE_ENV=production
ENV HOST_PASSWORD=""

# Expose the port the app runs on
EXPOSE 3636

# Run the server directly (bypassing npm start's strict --env-file requirement)
CMD [ "node", "server.js" ]
