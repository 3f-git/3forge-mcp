# Distributed Kubernetes Deployment

AMI's modular architecture allows each component (Center, Web, Relay) to run in a separate Kubernetes pod. This is the recommended pattern for production deployments that need to scale components independently.

**Requirements:** A functioning Kubernetes cluster, `kubectl` and `kustomize` installed, separate Docker images for each component with configured `local.properties`.

---

## Component Configuration

Each component requires its own `local.properties` specifying which tier it runs and how to reach Center.

**Center:**
```properties
ami.components=center
ami.center.port=3270
ami.db.jdbc.port=3280
ami.port=3289
ami.db.console.port=3290
f1.console.port=3285
```

**Web:**
```properties
ami.components=web
ami.center.port=3270
ami.center.host=ami-center-service    # Kubernetes ClusterIP service name
f1.console.port=3285
http.port=33332
```

**Relay:**
```properties
ami.components=relay
ami.center.port=3270
ami.center.host=ami-center-service
```

`ami.center.host` must match the Kubernetes `ClusterIP` service name that exposes the Center pod — see `center.yaml` below.

---

## Kubernetes Manifests

Create a directory `distributed_k8s/` with the following files.

**kustomization.yaml:**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - center.yaml
  - relay.yaml
  - web.yaml
```

**center.yaml** — StatefulSet + headless service (internal DNS) + ClusterIP service (internal access from Web/Relay):
```yaml
apiVersion: v1
kind: Service
metadata:
  name: ami-center-headless-service
spec:
  clusterIP: None
  selector:
    app: center
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ami-center
spec:
  serviceName: "ami-center-headless-service"
  replicas: 1
  selector:
    matchLabels:
      app: center
  template:
    metadata:
      labels:
        app: center
    spec:
      containers:
      - name: center
        image: ami-center-image     # replace with your Center image
        ports:
          - name: center-port
            containerPort: 3270
          - name: db-jdbc-port
            containerPort: 3280
          - name: port
            containerPort: 3289
          - name: db-console-port
            containerPort: 3290
          - name: f1-console-port
            containerPort: 3285
---
apiVersion: v1
kind: Service
metadata:
  name: ami-center-service          # this name must match ami.center.host
spec:
  type: ClusterIP
  selector:
    app: center
  ports:
    - name: center-port
      port: 3270
      targetPort: 3270
    - name: db-jdbc-port
      port: 3280
      targetPort: 3280
    - name: port
      port: 3289
      targetPort: 3289
    - name: db-console-port
      port: 3290
      targetPort: 3290
    - name: f1-console-port
      port: 3285
      targetPort: 3285
```

**web.yaml** — StatefulSet + headless service + NodePort for external browser access:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: ami-web-headless-service
spec:
  clusterIP: None
  selector:
    app: web
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ami-web
spec:
  serviceName: "ami-web-headless-service"
  replicas: 1
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: ami-web-image        # replace with your Web image
        ports:
          - name: http-port
            containerPort: 33332
          - name: center-port
            containerPort: 3270
          - name: f1-console-port
            containerPort: 3285
---
apiVersion: v1
kind: Service
metadata:
  name: ami-web-service
spec:
  type: NodePort
  selector:
    app: web
  ports:
    - name: http
      port: 80
      targetPort: 33332
      nodePort: 30080
```

**relay.yaml** — StatefulSet + headless service + LoadBalancer for external feed handler access:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: ami-relay-headless-service
spec:
  clusterIP: None
  selector:
    app: relay
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ami-relay
spec:
  serviceName: "ami-relay-headless-service"
  replicas: 1
  selector:
    matchLabels:
      app: relay
  template:
    metadata:
      labels:
        app: relay
    spec:
      containers:
      - name: relay
        image: ami-relay-image      # replace with your Relay image
        ports:
          - name: center-port
            containerPort: 3270
---
apiVersion: v1
kind: Service
metadata:
  name: ami-relay-service
spec:
  type: LoadBalancer
  selector:
    app: relay
  ports:
    - name: center-port
      port: 3270
      targetPort: 3270
```

---

## Deploy

```bash
cd distributed_k8s
kubectl apply -k .      # deploy all three components
kubectl get all         # verify pods and services
```

Access the Web UI at `http://<NODE_IP>:30080`.

---

## Service Topology

```
Browser → NodePort (ami-web-service :30080) → Web pod
Web pod → ClusterIP (ami-center-service :3270) → Center pod
Relay pod → ClusterIP (ami-center-service :3270) → Center pod
```

Center is never exposed externally — only Web and Relay reach it via `ClusterIP`.

---

## Cleanup

```bash
kubectl delete -k .
```

---

## See Also

- [`kubernetes.md`](kubernetes.md) — single-image pod deployment
- [`docker.md`](docker.md) — building Docker images
- [`guide.md`](guide.md) — deployment scenario overview and port reference
