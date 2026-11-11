FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json backend/package.json
RUN npm ci
COPY backend/tsconfig.json backend/tsconfig.json
COPY backend/prisma backend/prisma
COPY backend/src backend/src
COPY frontend/public frontend/public
RUN npm --workspace backend exec prisma generate && npm --workspace backend run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY backend/package*.json backend/package.json
RUN npm ci --omit=dev
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/frontend ./frontend
USER node
EXPOSE 4000
CMD ["sh", "-c", "npm --workspace backend exec prisma migrate deploy && node backend/dist/src/server.js"]