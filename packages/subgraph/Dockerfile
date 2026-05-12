FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    curl \
    binaryen \
    libsqlite3-dev \
    libpq-dev \
    ca-certificates \
    libssl-dev \
    pkg-config \
    build-essential \
    git \
    unzip \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && mkdir -p /opt/subgraph-deps \
    && cd /opt/subgraph-deps \
    && npm init -y \
    && npm install @graphprotocol/graph-ts@0.32.0 matchstick-as@0.6.0 assemblyscript@0.27.23 \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем protoc 3.20+ вручную (apt даёт слишком старый)
RUN curl -fL https://github.com/protocolbuffers/protobuf/releases/download/v21.12/protoc-21.12-linux-x86_64.zip \
    -o /tmp/protoc.zip \
    && unzip /tmp/protoc.zip -d /usr/local \
    && rm /tmp/protoc.zip

RUN for i in 1 2 3; do curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && break || sleep 5; done
ENV PATH="/root/.cargo/bin:/opt/subgraph-deps/node_modules/.bin:${PATH}"

RUN git clone --depth 1 --branch 0.6.0 https://github.com/LimeChain/matchstick.git /tmp/matchstick \
    && cd /tmp/matchstick \
    && cargo build --release \
    && cp target/release/matchstick /usr/local/bin/matchstick \
    && rm -rf /tmp/matchstick

# Create a Matchstick configuration template that points to the global libraries.
RUN echo "testsFolder: tests" > /matchstick.docker.yaml && \
    echo "manifestPath: subgraph.yaml" >> /matchstick.docker.yaml && \
    echo "schemaPath: schema.graphql" >> /matchstick.docker.yaml && \
    echo "libs:" >> /matchstick.docker.yaml && \
    echo "  - /opt/subgraph-deps/node_modules" >> /matchstick.docker.yaml && \
    echo "  - /opt/subgraph-deps/node_modules/matchstick-as" >> /matchstick.docker.yaml

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]