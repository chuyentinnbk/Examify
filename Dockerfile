# Base Node.js image
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Dependencies installation
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

# Build application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="mysql://examify_user:examify_password@localhost:3306/examify_db"
ENV JWT_SECRET="production_build_placeholder_secret_key_32chars"
ENV NEXT_PUBLIC_APP_URL="http://localhost:3000"
RUN npx prisma generate
RUN npm run build

# Production runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN mkdir -p /app/storage/exams /app/storage/logs /app/storage/academic-data && \
    chown -R nextjs:nodejs /app/storage

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/storage/academic-data ./storage/academic-data

USER nextjs
EXPOSE 3000

CMD ["npm", "run", "start"]
