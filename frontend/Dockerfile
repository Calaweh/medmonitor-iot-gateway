FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Nginx config for SPA routing is handled by the root docker/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]