FROM oven/bun:1-debian

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    jq \
    curl \
    wget \
    openssh-client \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install gh CLI
RUN mkdir -p -m 755 /etc/apt/keyrings \
    && wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
    && chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update && apt-get install -y gh \
    && rm -rf /var/lib/apt/lists/*

# Install opencode CLI + oh-my-opencode plugin globally
RUN bun install -g opencode-ai oh-my-opencode@latest

# Copy source and build
WORKDIR /app
COPY . .
RUN bun install && bun run build

# Link CLI globally
WORKDIR /app/apps/cli
RUN bun link

# Bake entrypoint into image (no volume mount needed)
COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create sylas home
RUN mkdir -p /root/.sylas

WORKDIR /app
EXPOSE 3456
ENTRYPOINT ["/entrypoint.sh"]
CMD ["sylas", "start"]
