FROM node:24-alpine
LABEL org.opencontainers.image.source="https://github.com/aleixribera/3d-souls-low"
LABEL org.opencontainers.image.description="Combat Arena 3D with one public co-op lobby"
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev && npm cache clean --force
COPY combat-arena-3d.html index.html ./
COPY js ./js
COPY assets ./assets
COPY server ./server
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server/index.cjs"]
