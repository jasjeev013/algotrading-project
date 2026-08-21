# Use official Node.js image (Alpine is a super lightweight version)
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install frontend dependencies
RUN npm install && chmod -R +x node_modules/.bin

# Copy the rest of the frontend code
COPY . .

# Expose port 5173 for Vite
EXPOSE 5173

# Run the Vite development server and expose it to the network
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]