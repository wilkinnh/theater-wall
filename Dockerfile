# Theater Wall Display - Docker Container
FROM nginx:alpine

# Copy static files to nginx serving directory
COPY . /usr/share/nginx/html

# Create nginx configuration for the theater wall
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]