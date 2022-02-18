FROM nginx:1.21.1
COPY build/ /usr/share/nginx/html
# COPY nginx.conf /etc/nginx/nginx.conf