FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (Prisma CLI required at build/runtime)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application (apply migrations and seed before starting)
CMD ["sh", "-c", "npm run migrate && npm run seed && npm run start:prod"]