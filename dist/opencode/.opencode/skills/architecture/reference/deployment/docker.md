# Running 3forge with Docker

Docker enables deploying and managing multiple isolated AMI instances. This guide covers building a Docker image and launching one or more containers.

**Requirements:** Docker, Java 1.8, WSL (Windows only — all commands run inside WSL).

---

## Step 1 — Create Dockerfile

Create a file named `Dockerfile` (no extension) in the root of your AMI installation:

```dockerfile
FROM openjdk:8-jdk

WORKDIR /opt/ami

COPY . .

RUN chmod +x amione/scripts/start.sh

ENV JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64
ENV PATH="$JAVA_HOME/bin:$PATH"

EXPOSE 33332

CMD ["bash", "amione/scripts/start.sh", "1"]
```

---

## Step 2 — Build the Image

From the AMI installation directory:

```bash
docker build -t ami-image .
```

---

## Step 3 — Modify start.sh for Multi-Container Launch

Prepend the following block to `amione/scripts/start.sh`. It reads a container count argument and launches that many containers, each with uniquely named Docker volumes for persistence:

```bash
BASE_NAME="ami-instance"
BASE_HOST_PORT=33332
CONTAINER_PORT=33332
IMAGE_NAME="ami-image"
NUM_CONTAINERS=${1:-1}

PERSIST_DIRS=(
    "config"
    "data"
    "hdb"
    "persist"
    "lib"
    "web_resources"
    "scripts"
)

echo "Starting to launch $NUM_CONTAINERS containers..."

for ((i=0; i<NUM_CONTAINERS; i++)); do
    UNIQUE_HOSTNAME="${BASE_NAME}-${i}"
    HOST_PORT=$((BASE_HOST_PORT + i))
    VOLUME_FLAGS=""

    for dir in "${PERSIST_DIRS[@]}"; do
        VOLUME_NAME="${UNIQUE_HOSTNAME}-${dir}-dir"
        APP_PATH="/ami/amione/${dir}"
        VOLUME_FLAGS+=" -v $VOLUME_NAME:$APP_PATH"
    done

    echo "Launching container: $UNIQUE_HOSTNAME on port $HOST_PORT"

    docker run -d \
        --hostname "$UNIQUE_HOSTNAME" \
        --name "$UNIQUE_HOSTNAME" \
        -p "${HOST_PORT}:${CONTAINER_PORT}" \
        $VOLUME_FLAGS \
        "$IMAGE_NAME"
done

echo ""
echo "--- Active Containers ---"
docker ps --filter "name=$BASE_NAME"

echo ""
echo "--- Created Volumes ---"
docker volume ls --filter "name=${BASE_NAME}-.*-data"
```

**Configuration parameters:**

| Parameter | Purpose |
|---|---|
| `BASE_NAME` | Prefix for container names and hostnames (e.g. `ami-instance`) |
| `IMAGE_NAME` | Docker image to run (`ami-image`) |
| `NUM_CONTAINERS` | Number of container instances to launch |
| `PERSIST_DIRS` | Directories persisted via named volumes — one volume per dir per container |

Each container gets a unique hostname (`ami-instance-0`, `ami-instance-1`, …) and a unique host port starting from `BASE_HOST_PORT`.

---

## Step 4 — Launch Containers

```bash
./start.sh        # Single container on port 33332
./start.sh 3      # Three containers on ports 33332, 33333, 33334
```

---

## Notes

- **Port conflicts:** Each container maps to a distinct host port. Ensure no existing processes occupy those ports.
- **Volumes:** Each container's `config`, `data`, `persist`, `lib`, and other directories are isolated in named Docker volumes. Changes to one container do not affect others.
- **Windows / WSL:** All commands must be run inside WSL, not from a Windows terminal.

---

## See Also

- [`kubernetes.md`](kubernetes.md) — orchestrated multi-pod deployment
- [`distributed-kubernetes.md`](distributed-kubernetes.md) — split Center/Web/Relay across pods
- [`guide.md`](guide.md) — deployment scenario overview
