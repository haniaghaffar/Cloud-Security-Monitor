# Cloud Security Monitor

React, TypeScript, Vite, and Tailwind CSS frontend for the Cloud Security Monitor. The frontend consumes Member 1's Azure backend and uses Microsoft Entra ID through MSAL; it does not provision backend, database, or identity resources.

## Azure architecture

```text
Browser -- HTTPS --> Azure Static Web Apps (React/Vite static build)
   |                         |
   +-- MSAL / Entra ID       +-- SPA route fallback and security headers
   |
   +-- HTTPS API requests --> Member 1's Azure backend (configured separately)
```

Terraform provisions only a frontend resource group and an **Azure Static Web App (Free tier)**. Static Web Apps provides managed HTTPS and a default hostname without a separately billed CDN, storage account, or Front Door. The app shell is intentionally public; application sign-in is handled by the existing Entra/MSAL integration, and backend authorization remains the backend's responsibility. Public network access is enabled for the site, while GitHub production publishing is restricted to the protected `main` branch/environment and a narrowly scoped OIDC identity.

`public/staticwebapp.config.json` configures React Router's SPA fallback and baseline response security headers. No backend/API or identity resources are created by this project.

## Local development and environment configuration

Requirements: Node.js 22 and npm. Install and run:

```sh
npm ci
npm run dev
```

The app reads these Vite variables:

| Variable | Development | Production |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Leave empty until the real backend URL is available. | Required HTTPS URL for Member 1's backend. |
| `VITE_AUTH_CLIENT_ID` | Entra public SPA application ID, when configured. | Required Entra public SPA application ID. |
| `VITE_AUTH_TENANT_ID` | Entra directory/tenant ID, when configured. | Required Entra directory/tenant ID. |
| `VITE_AUTH_API_SCOPE` | Delegated API permission supplied by Member 1, when configured. | Required delegated scope exposed by Member 1's backend API. |
| `VITE_AUTH_REDIRECT_URI` | Usually `http://localhost:5173`. | Optional; defaults to the deployed site origin. |

Use [.env.development.example](./.env.development.example) and [.env.production.example](./.env.production.example) as templates. For local development, create `.env.development.local` and supply only real configuration values. These local files are ignored by Git. Vite variables are public and embedded in the downloaded bundle: **never put client secrets, access tokens, or other credentials in them**. An empty value does not enable mock data or fake authentication.

Production deployment intentionally fails unless the real HTTPS API URL, Entra IDs, delegated backend API scope, and Azure resource/authentication variables have been configured. The backend API scope must be exposed by Member 1's Entra application; the frontend does not request Microsoft Graph permissions. If Member 1's backend or Entra application is not ready, configure those values before enabling deployment; do not substitute demo URLs, fake IDs, or mock data.

The assumed API paths and request/response shapes are **proposed frontend expectations, not a confirmed backend contract**. See [docs/BACKEND_INTEGRATION.md](./docs/BACKEND_INTEGRATION.md) for the details Member 1 must confirm before connecting production.

## Terraform setup

Terraform 1.5+ and Azure access to the target subscription are required. The official `hashicorp/azurerm` provider (4.x) is used. Terraform state is local by default; no remote backend is configured because no state storage account has been provided. Provider-computed sensitive values may be held in Terraform state: keep state private, never commit it, and do not put credentials in `.tfvars`.

```sh
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars for the chosen environment and region.
az login
terraform init
terraform fmt -check -recursive
terraform validate
terraform plan
```

The subscription can be selected using `ARM_SUBSCRIPTION_ID` or the optional `subscription_id` variable. Review the plan before provisioning. **Do not run `terraform apply` or `terraform destroy` without explicit approval.** For production, use a separate state directory/workspace and state file from development; for example, create/select a `production` workspace and run `terraform plan -var="environment=production"`. Keep state protected and backed up. Outputs include the Static Web App name, resource group, and HTTPS URL. Copy the resource group and app name to the GitHub production environment variables below.

To clean up, review the target state and plan first, then run `terraform destroy` only with explicit approval. This removes the frontend resource group and Static Web App; it does not remove Member 1's backend resources.

## GitHub Actions

- [Frontend CI](./.github/workflows/frontend-ci.yml) runs on pushes and pull requests. It uses `npm ci` with `package-lock.json`, lint, TypeScript checks, `qa_test.mjs`, and a production build.
- [Azure deployment](./.github/workflows/deploy-azure.yml) runs on pushes to `main`. It repeats the same quality gates, so any failure blocks deployment, then builds with production variables and deploys to Azure Static Web Apps.

Create a GitHub **Environment** named `production`. Add these environment **variables** (not secrets):

| Variable | Value |
| --- | --- |
| `AZURE_CLIENT_ID` | Microsoft Entra service principal/application client ID configured for GitHub OIDC. |
| `AZURE_TENANT_ID` | Microsoft Entra tenant ID. |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID. |
| `AZURE_RESOURCE_GROUP` | Terraform `resource_group_name` output. |
| `AZURE_STATIC_WEB_APP_NAME` | Terraform `static_web_app_name` output. |
| `VITE_API_BASE_URL` | Actual HTTPS API URL supplied by Member 1. |
| `VITE_AUTH_CLIENT_ID` | Entra public SPA application ID. |
| `VITE_AUTH_TENANT_ID` | Entra directory/tenant ID. |
| `VITE_AUTH_REDIRECT_URI` | Optional registered redirect URI; defaults to the Static Web App origin. |

Configure a Microsoft Entra federated identity credential for the GitHub repository with subject `repo:<OWNER>/<REPOSITORY>:environment:production`, issuer `https://token.actions.githubusercontent.com`, and audience `api://AzureADTokenExchange`. Grant its service principal only the Azure permissions needed to read the Static Web App deployment token and deploy to that app (for example, an appropriately scoped Static Web App Contributor assignment). No client secret is needed. The workflow uses `azure/login` with GitHub OIDC and fetches the deployment token at runtime; it does not use a long-lived Azure credential secret or expose the token as a Terraform output.

Restrict the `production` environment to the `main` branch and configure required reviewers if production approval is needed. Add the deployed HTTPS origin to the Entra SPA registration's redirect URIs. The workflow only publishes static frontend content; it never provisions infrastructure or deploys the backend.

## Validation and cost

Run local frontend checks with:

```sh
npm ci
npm run lint
npm run typecheck
node qa_test.mjs
npm run build
```

Terraform validation commands are listed above. The Azure Static Web Apps Free plan avoids dedicated compute, storage, and Front Door costs for this static frontend, subject to Microsoft's current free-tier quotas and availability. Enabling a custom domain, higher-tier features, traffic beyond quota, or other Azure services may incur charges; review current Azure pricing and the plan before provisioning.
