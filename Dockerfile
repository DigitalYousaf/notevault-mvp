# NoteVault — multi-stage-ish single Dockerfile (Node 24 Alpine).
# The SQLite file lives in /app/data, persisted via a Docker volume.
FROM node:24-alpine

WORKDIR /app

# Install only production deps (express)
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# App code (node_modules excluded via .dockerignore)
COPY server.js db.js auth.js ./
COPY routes ./routes
COPY middleware ./middleware
COPY public ./public

# Data dir for the SQLite file (mounted as a volume in compose)
RUN mkdir -p /app/data

EXPOSE 3000
ENV PORT=3000 NODE_ENV=production

CMD ["node", "server.js"]
