FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends bash \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev

COPY scripts/twak-sidecar-start.sh scripts/
RUN chmod +x scripts/twak-sidecar-start.sh

ENV NODE_ENV=production

CMD ["bash", "scripts/twak-sidecar-start.sh"]
