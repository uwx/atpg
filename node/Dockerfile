FROM node:22

WORKDIR /usr/src/app

RUN apt-get update \
  && apt-get install -y libpq-dev g++ make \
  && rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --ignore-scripts=false --unsafe-perm

COPY . .

# EXPOSE 3000

CMD ["pnpm", "run", "dev"]