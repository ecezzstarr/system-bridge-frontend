FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json tsconfig.json ./
RUN npm install

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production

# Run
CMD ["npm", "start"]
