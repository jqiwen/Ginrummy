# GitHub Actions → Google Cloud setup

This repository deploys to the existing `ginrummy-506118` project, `cloud-run-source-deploy` Artifact Registry repository, and `ginrummy-game-service` Cloud Run service in `northamerica-northeast2`. The setup below does not create a second project, registry, or service.

## One-time Workload Identity Federation setup

Run these commands from Bash or Google Cloud Shell while authenticated as a project administrator. The provider accepts tokens only from `jqiwen/Ginrummy` on `refs/heads/master`.

```bash
GCP_PROJECT_ID="ginrummy-506118"
GCP_REGION="northamerica-northeast2"
ARTIFACT_REPOSITORY="cloud-run-source-deploy"
CLOUD_RUN_SERVICE="ginrummy-game-service"
POOL_ID="github-actions"
PROVIDER_ID="github"
DEPLOYER_NAME="ginrummy-github-deployer"
DEPLOYER_SA="${DEPLOYER_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_SA="869554899500-compute@developer.gserviceaccount.com"
PROJECT_NUMBER="$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')"

gcloud iam service-accounts create "$DEPLOYER_NAME" \
  --project "$GCP_PROJECT_ID" \
  --display-name "Gin Rummy GitHub deployer"

gcloud iam workload-identity-pools create "$POOL_ID" \
  --project "$GCP_PROJECT_ID" \
  --location global \
  --display-name "GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --project "$GCP_PROJECT_ID" \
  --location global \
  --workload-identity-pool "$POOL_ID" \
  --display-name "jqiwen/Ginrummy master" \
  --issuer-uri "https://token.actions.githubusercontent.com" \
  --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref,attribute.actor=assertion.actor" \
  --attribute-condition "assertion.repository == 'jqiwen/Ginrummy' && assertion.ref == 'refs/heads/master'"

PRINCIPAL_SET="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/jqiwen/Ginrummy"

gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_SA" \
  --project "$GCP_PROJECT_ID" \
  --member "$PRINCIPAL_SET" \
  --role "roles/iam.workloadIdentityUser"

gcloud artifacts repositories add-iam-policy-binding "$ARTIFACT_REPOSITORY" \
  --project "$GCP_PROJECT_ID" \
  --location "$GCP_REGION" \
  --member "serviceAccount:${DEPLOYER_SA}" \
  --role "roles/artifactregistry.writer"

gcloud run services add-iam-policy-binding "$CLOUD_RUN_SERVICE" \
  --project "$GCP_PROJECT_ID" \
  --region "$GCP_REGION" \
  --member "serviceAccount:${DEPLOYER_SA}" \
  --role "roles/run.developer"

gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --project "$GCP_PROJECT_ID" \
  --member "serviceAccount:${DEPLOYER_SA}" \
  --role "roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
  --member "serviceAccount:${DEPLOYER_SA}" \
  --role "roles/logging.viewer"
```

The role scopes are intentional:

| Scope | Role | Purpose |
| --- | --- | --- |
| Existing Artifact Registry repository | `roles/artifactregistry.writer` | Push immutable images |
| Existing Cloud Run service | `roles/run.developer` | Create revisions and update traffic |
| Existing runtime service account | `roles/iam.serviceAccountUser` | Attach the already configured runtime identity |
| Project logs | `roles/logging.viewer` | Print useful diagnostics after a failed deployment |
| Deployer service account | `roles/iam.workloadIdentityUser` | Exchange the narrowly trusted GitHub OIDC token |

The Cloud Run service is already public through `allUsers → roles/run.invoker`. Confirm that the binding remains present:

```bash
gcloud run services get-iam-policy ginrummy-game-service \
  --project ginrummy-506118 \
  --region northamerica-northeast2
```

The deployment identity is deliberately not granted Owner, Editor, Cloud Run Admin, or project-wide Service Account User.

## Repository variables

Set these non-secret repository variables after authenticating `gh`:

```bash
gh variable set GCP_PROJECT_ID --repo jqiwen/Ginrummy --body "ginrummy-506118"
gh variable set GCP_REGION --repo jqiwen/Ginrummy --body "northamerica-northeast2"
gh variable set GCP_ARTIFACT_REPOSITORY --repo jqiwen/Ginrummy --body "cloud-run-source-deploy"
gh variable set GCP_CLOUD_RUN_SERVICE --repo jqiwen/Ginrummy --body "ginrummy-game-service"
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --repo jqiwen/Ginrummy --body "projects/869554899500/locations/global/workloadIdentityPools/github-actions/providers/github"
gh variable set GCP_SERVICE_ACCOUNT --repo jqiwen/Ginrummy --body "ginrummy-github-deployer@ginrummy-506118.iam.gserviceaccount.com"
gh variable set FRONTEND_ORIGIN --repo jqiwen/Ginrummy --body "https://ginrummy.jqiwen.com"
```

No JSON key, access token, or Google Cloud secret should be added to GitHub.

## Workflow behavior

- `ci.yml` runs frontend and backend verification without deploying.
- `deploy-game-service.yml` stages a no-traffic revision, checks HTTP and direct WebSocket connectivity, and then assigns 100% traffic to that exact revision.
- `deploy-pages.yml` authenticates with the same WIF identity, queries the active Cloud Run service URL, and injects it as `NEXT_PUBLIC_GAME_WS_URL` during the static build.

Manual runs must target `master`, which is also enforced by the WIF provider condition.
