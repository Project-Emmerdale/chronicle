FROM node:20-slim
WORKDIR /usr/src/app

# Copy workspace root package files so we can install production deps
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy the built output from the monorepo build step
COPY apps/backend-live-server/dist ./dist

ENV NODE_ENV=production
EXPOSE 3000

# Start the built server
CMD ["node", "dist/main.js"]
