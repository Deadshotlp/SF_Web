FROM node:20-bookworm-slim

# Arbeitsverzeichnis
WORKDIR /app/server

# Nur package.json zuerst (für besseren Cache)
COPY server/package*.json ./

# Dependencies installieren
RUN npm ci --omit=dev

# Restlichen Code kopieren
COPY server ./

# Port freigeben
EXPOSE 3001

# Environment (optional)
ENV NODE_ENV=production

# Server starten
CMD ["npm", "start"]