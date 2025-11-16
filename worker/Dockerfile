FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy worker code
COPY . .

# Run worker
CMD ["npm", "start"]
