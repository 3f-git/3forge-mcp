# Running 3forge with Kubernetes

This guide deploys a single-image AMI StatefulSet on Kubernetes using Minikube (local) or any Kubernetes cluster.

**Requirements:** Docker image built from [`docker.md`](docker.md), `kubectl`, `kustomize`.

---

## Install Minikube (Windows)

```powershell
# Run in PowerShell as administrator
Set-ExecutionPolicy Bypass -Scope Process -Force
iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
choco install minikube kubernetes-cli -y
minikube start --driver=docker
kubectl get nodes    # verify
```

For Unix/Linux, use your package manager to install `minikube` and `kubectl`, then `minikube start`.

---

## Kubernetes Manifests

Create a directory `k8s/` and add the following files.

**kustomization.yaml** — lists all manifests to apply together:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - statefulSet.yaml
  - services.yaml
  - storageClass.yaml
  - persistentVolume.yaml
```

**storageClass.yaml** — local storage class (swap provisioner for cloud):

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ami-storage-class
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Retain
```

**persistentVolume.yaml** — local persistent volume bound to a node path:

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: ami-pv-0
spec:
  capacity:
    storage: 5Gi
  volumeMode: Filesystem
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: ami-storage-class
  local:
    path: /mnt/data/ami-0
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - docker-desktop    # replace with your node name
```

Create the directory on the node first:

```bash
kubectl get nodes                                      # find node name
kubectl debug node/<YOUR_NODE_NAME> -it --image=ubuntu
mkdir -p /host/mnt/data/ami-0
exit
```

**services.yaml** — headless service (internal DNS) + NodePort (external access):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ami-headless-service
spec:
  clusterIP: None
  selector:
    app: ami
  ports:
    - protocol: TCP
      port: 80
      targetPort: 33332
---
apiVersion: v1
kind: Service
metadata:
  name: ami-instance-0-service
spec:
  type: NodePort
  externalTrafficPolicy: Local
  selector:
    statefulset.kubernetes.io/pod-name: ami-instance-0
  ports:
    - port: 80
      targetPort: 33332
      nodePort: 30080
```

**statefulSet.yaml** — StatefulSet with init container to seed persistent storage:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ami-instance
spec:
  selector:
    matchLabels:
      app: ami
  serviceName: "ami-headless-service"
  replicas: 1
  template:
    metadata:
      labels:
        app: ami
    spec:
      imagePullSecrets:
        - name: regcred          # omit if image is public
      subdomain: ami-headless-service
      initContainers:
        - name: init-default-files
          image: ami-image
          command:
            - "sh"
            - "-c"
            - |
              set -e
              for dir in config data hdb lib persist scripts web_resources; do
                if [ ! -d "/init-data/${dir}" ]; then
                  cp -r "/ami/amione/${dir}" /init-data/
                fi
              done
          volumeMounts:
            - name: ami-local-storage
              mountPath: /init-data
      containers:
        - name: ami-container
          image: ami-image
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 33332
          volumeMounts:
            - name: ami-local-storage
              mountPath: /ami/amione/config
              subPath: config
            - name: ami-local-storage
              mountPath: /ami/amione/data
              subPath: data
            - name: ami-local-storage
              mountPath: /ami/amione/hdb
              subPath: hdb
            - name: ami-local-storage
              mountPath: /ami/amione/lib
              subPath: lib
            - name: ami-local-storage
              mountPath: /ami/amione/persist
              subPath: persist
            - name: ami-local-storage
              mountPath: /ami/amione/scripts
              subPath: scripts
            - name: ami-local-storage
              mountPath: /ami/amione/web_resources
              subPath: web_resources
  volumeClaimTemplates:
    - metadata:
        name: ami-local-storage
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: "ami-storage-class"
        resources:
          requests:
            storage: 5Gi
```

---

## Deploy

```bash
cd k8s
kubectl apply -k .       # deploy all resources
kubectl get all          # verify pods, services, statefulsets
```

Access the UI at `http://<NODE_IP>:30080`.

---

## Scaling

To add more replicas, increase `replicas:` in `statefulSet.yaml` and add a corresponding NodePort service for each pod (`ami-instance-1-service`, `ami-instance-2-service`, …). Each pod gets a stable DNS name: `ami-instance-<N>.ami-headless-service`.

---

## Private Registry

```bash
kubectl create secret docker-registry regcred \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=<your-username> \
  --docker-password=<your-token>
```

Reference `regcred` under `imagePullSecrets` in the StatefulSet spec (already shown above).

---

## Cleanup

```bash
# Preserve volumes (pod/service removed, data retained)
kubectl delete service/ami-headless-service
kubectl delete service/ami-instance-0-service
kubectl delete statefulset/ami-instance

# Complete teardown (data in /mnt/data/ami-0 remains on disk but is orphaned)
kubectl delete -k .
```

---

## See Also

- [`docker.md`](docker.md) — building the Docker image
- [`distributed-kubernetes.md`](distributed-kubernetes.md) — split Center/Web/Relay across pods
- [`guide.md`](guide.md) — deployment scenario overview
