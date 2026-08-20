# Use Node.js LTS version as the base image
FROM node:18

# Set the working directory
WORKDIR /app

# Copy the package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire project to the working directory in the container
COPY . .

# Build the application
RUN npm run build

# Expose the port Next.js runs on
EXPOSE 3000

# Start Next.js in production mode
CMD ["npm", "run", "start"]
