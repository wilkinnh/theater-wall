# Theater Wall Display - Docker Container
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Expose port 8000 (default server port)
EXPOSE 8000

# Start the Node.js server
CMD ["node", "server.js"]