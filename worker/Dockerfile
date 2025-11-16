FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including tsx for runtime)
RUN npm install

# Copy worker code
COPY index.ts ./

# Compile TypeScript to JavaScript
RUN npx tsc

# Run compiled JavaScript
CMD ["node", "dist/index.js"]
