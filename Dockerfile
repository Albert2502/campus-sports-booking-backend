FROM node:24-bookworm-slim

WORKDIR /app

# Full install: the container runs migrations and db:demo, and sequelize-cli
# is a devDependency.
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

COPY .sequelizerc ./
COPY db ./db
COPY docs ./docs
COPY src ./src

# The uploads volume takes this folder's owner when Docker first creates it.
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node

ENV UPLOADS_DIR=/app/uploads
EXPOSE 3000

CMD ["sh", "-c", "npx sequelize-cli db:migrate && node src/server.js"]
