# Use a lightweight Node.js base image
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Copy dependency files first
COPY package*.json ./

# Install dependencies
# (Use 'npm ci' if you have a package-lock.json for a cleaner install)
RUN npm install --production

# Copy all project files
COPY . .

# CORRECTION: Update this to 5000 to match your server.js
EXPOSE 5000

# Start the Node.js server
CMD ["node", "server.js"]