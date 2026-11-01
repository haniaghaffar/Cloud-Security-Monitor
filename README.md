Cloud Security Monitor

<p align="center">

<strong>{=html}Cloud Security Monitor</strong>{=html}<br />{=html}
<em>{=html}A cloud-native security monitoring dashboard for
identifying, investigating, and tracking suspicious cloud
activity.</em>{=html}

</p>

<p align="center">

<img alt="Platform" src="https://img.shields.io/badge/Cloud-Microsoft%20Azure-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white" />{=html}
<img alt="Frontend" src="https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />{=html}
<img alt="Styling" src="https://img.shields.io/badge/Styling-Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />{=html}
<img alt="Infrastructure" src="https://img.shields.io/badge/IaC-Terraform-7B42BC?style=for-the-badge&logo=terraform&logoColor=white" />{=html}

</p>

Overview

Cloud Security Monitor is a cloud security monitoring solution
designed to help teams gain visibility into cloud activity, identify
potentially malicious behaviour, and investigate security incidents from
one centralized dashboard.

The platform is designed around a detection-and-response workflow:

Collect cloud activity and security logs.

Process events and evaluate them against security detection rules.

Generate structured findings with severity levels.

Store findings for investigation and tracking.

Present security insights through a web dashboard.

Support alerting and reporting so that important incidents are not
overlooked.

The current project direction uses Microsoft Azure. The original
project concept described an AWS-based design; the implementation
direction was subsequently changed to Azure. Azure services and
infrastructure should therefore be configured according to the final
team architecture and backend integration contract.

Key Objectives

Centralize security findings in one dashboard.

Make suspicious cloud activity easier to identify.

Prioritize incidents using severity levels.

Provide enough event context to support investigation.

Track findings through their lifecycle.

Support a maintainable frontend and repeatable infrastructure
workflow.

Core Features

1. Security Overview

A dashboard overview intended to provide a quick snapshot of the cloud
security posture, including:

Total monitored events

Threats detected today

Severity distribution

Top risky source IP addresses

Recent security findings

2. Threat Timeline

A chronological view of security findings, with filtering options
intended for:

Date or time range

Severity

Event type

Finding status

3. Incident Details

A focused investigation view for an individual finding, designed to
show:

Event timestamp and type

Severity

User or role involved

Source IP address

Region or country, when available

Event description and reason it was flagged

Recommended action

Current finding status

4. Alert Settings

A settings area for configuring which severity levels should generate
notifications. Actual notification delivery depends on the backend and
Azure alerting configuration.

5. Reports

A reporting area intended to support exporting security findings and
summaries in CSV and PDF formats.

6. Authentication

The frontend is designed to integrate with Microsoft Entra ID for
sign-in. Authentication requires valid tenant/application configuration
and a matching identity configuration in the Azure environment.

Detection Scenarios

The detection logic is intended to identify suspicious or risky cloud
activity, including:

Scenario                            What it may indicate

Repeated failed sign-in attempts    Possible brute-force activity or
credential guessing

Sign-in from an unusual region      Potential account compromise or
unexpected access

Root or highly privileged account   Risky use of elevated privileges
usage

IAM / role permission changes       Unexpected privilege escalation or
access changes

Security rule opened to 0.0.0.0/0 Resource exposed to the public
internet

Public storage access               Potential unintended data exposure

Detection rules, event sources, and supported fields must match the
backend implementation. The scenarios above describe the project
scope; they do not imply that every rule is already deployed.

Severity Levels

Severity                            Meaning

Critical                        A potentially severe security issue
requiring immediate investigation

High                            A significant risk that should be
reviewed promptly

Medium                          Suspicious activity that needs
investigation

Architecture

The intended Azure-oriented architecture separates event collection and
detection from the dashboard experience.

Cloud Activity / Diagnostic Logs
              |
              v
       Azure Log Sources
              |
              v
     Processing & Detection
       (Azure Functions)
              |
              v
       Findings Storage
        (Azure Cosmos DB)
              |
              v
       Backend API Layer
     (API Management / API)
              |
              v
       React Web Dashboard
              |
              v
     Microsoft Entra ID Sign-in

       Alerting / Notifications
     (Azure-based alert workflow)

Azure service mapping

The following is the proposed Azure direction for the original
AWS-oriented design. Final service selection and ownership must be
confirmed with the backend/DevOps team.

Original design component           Azure-oriented option

AWS CloudTrail                      Azure Activity Logs

VPC Flow Logs                       Azure network diagnostic / flow-log
solution, subject to current Azure
service support

Amazon S3                           Azure Blob Storage

AWS Lambda                          Azure Functions

Amazon DynamoDB                     Azure Cosmos DB

Amazon SNS                          Azure Monitor alerting, Logic Apps,
or another agreed notification
service

Amazon API Gateway                  Azure API Management or an agreed
API hosting layer

Amazon Cognito                      Microsoft Entra ID

Important: This table is an architectural mapping, not a statement
that these Azure resources have already been provisioned. The final
design should avoid creating duplicate resources owned by another team
member.

Frontend & DevOps Scope

The frontend/DevOps workstream focuses on:

Building the React dashboard and its reusable UI components.

Implementing the overview, timeline, incident, settings, and reports
screens.

Integrating the frontend with the agreed backend API contract.

Connecting sign-in through Microsoft Entra ID.

Managing environment-based configuration.

Preparing Azure infrastructure using Terraform, where included in
the final team scope.

Setting up GitHub Actions for validation and deployment workflows.

Documenting setup, configuration, and backend integration
requirements.

Technology Stack

Area                                Technology

Frontend framework                  React

Language                            TypeScript

Build tool                          Vite

Styling                             Tailwind CSS

Authentication                      Microsoft Entra ID (MSAL
integration)

Cloud platform                      Microsoft Azure

Infrastructure as Code              Terraform

CI/CD                               GitHub Actions

The exact Azure services, API routes, and deployment target should be
confirmed against the current repository and team implementation.

Project Structure

A typical frontend structure for this project may look like the
following. The actual repository structure should take precedence if it
differs.

cloud-security-monitor/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── pages/
│   │   ├── Login/
│   │   ├── Overview/
│   │   ├── ThreatTimeline/
│   │   ├── IncidentDetails/
│   │   ├── AlertSettings/
│   │   └── Reports/
│   ├── services/
│   │   ├── api/
│   │   └── auth/
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── infrastructure/
│   └── terraform/
├── .github/
│   └── workflows/
├── .env.example
├── package.json
└── README.md

Getting Started

Prerequisites

Install the following before running the frontend:

Node.js (use the version supported by the repository)

npm, pnpm, or yarn (use the package manager indicated by the
lockfile)

Git

Access to the configured backend API

Microsoft Entra ID application details for authentication, when
authentication is enabled

1. Clone the repository

git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_DIRECTORY>

Replace the placeholders with the actual repository URL and directory
name.

2. Install dependencies

Use the package manager matching the repository lockfile.

npm install

3. Configure environment variables

Create a local .env file in the project root. Do not commit real
credentials or secrets.

VITE_API_BASE_URL=
VITE_AUTH_CLIENT_ID=
VITE_AUTH_TENANT_ID=

Variable                Purpose

VITE_API_BASE_URL     Base URL of the backend API
VITE_AUTH_CLIENT_ID   Microsoft Entra ID application/client ID
VITE_AUTH_TENANT_ID   Microsoft Entra ID tenant ID

Only use the variables that are actually referenced by the application.
Any additional configuration required by the final implementation should
be documented in .env.example.

Vite exposes VITE_* values to the browser bundle. Never place client
secrets, private keys, passwords, or other confidential credentials in
frontend environment variables.

4. Start the development server

npm run dev

Open the local URL printed by Vite in your terminal.

5. Create a production build

npm run build

Run the repository's linting, type-checking, and test scripts as
available:

npm run lint
npm run typecheck
npm test

Script names vary by repository. Check package.json and use the
scripts that are actually defined.

Backend Integration

The frontend should consume real backend data through a centralized API
service layer. The frontend and backend teams must agree on endpoint
paths, HTTP methods, authentication requirements, and response schemas
before integration is considered complete.

The finding model is expected to carry information corresponding to
fields such as:

type FindingStatus = "open" | "reviewed" | "resolved";
type Severity = "low" | "medium" | "high" | "critical";

interface SecurityFinding {
  finding_id: string;
  timestamp: string;
  event_type: string;
  severity: Severity;
  user_or_role: string;
  source_ip: string;
  region?: string;
  country?: string;
  description: string;
  status: FindingStatus;
}

This is a starting data shape based on the project specification,
not a confirmed backend API response. Adjust it to the schema agreed
with the backend team.

Before connecting the frontend, confirm:

Findings list and individual finding endpoints

Dashboard statistics and severity aggregation endpoints

Timeline filtering and pagination behaviour

Alert settings read/update endpoints

Report export strategy

Authentication token requirements and API authorization rules

Standard error response format

See BACKEND_INTEGRATION.md if it exists in the repository for the
implementation-specific integration contract.

Infrastructure & CI/CD

Terraform and GitHub Actions are intended to support repeatable
infrastructure management and automated quality checks.

A recommended workflow is:

Install dependencies using the committed lockfile.

Run linting and TypeScript checks.

Run automated tests.

Generate a production build.

Validate Terraform formatting and configuration.

Deploy only through an explicitly configured and authorized
deployment workflow.

Infrastructure deployment must use the team's approved Azure
subscription, resource naming, state management, permissions, and
authentication method. Prefer federated/OIDC authentication for GitHub
Actions where supported by the environment.

No infrastructure should be applied or destroyed automatically as part
of a local setup step. Review Terraform plans and obtain the required
team approval before provisioning or changing Azure resources.

Security Considerations

Do not commit .env files, credentials, access tokens, or private
keys.

Keep secrets in an approved secret manager or CI/CD secret store.

Do not expose privileged credentials in frontend code.

Validate and handle API responses safely.

Enforce authorization on the backend; hiding a frontend control is
not access control.

Use HTTPS for deployed application and API traffic.

Configure Entra ID redirect URIs and allowed origins for the correct
environments.

Apply least-privilege access to Azure resources and deployment
identities.

Review Terraform changes before applying them.

Keep dependencies updated and review security advisories.

Current Implementation Status

This README describes the project scope and intended Azure-oriented
architecture. It does not claim that cloud resources, backend
endpoints, authentication, alert delivery, or production deployment are
already operational.

Update this section as the team completes and verifies each component:

Frontend pages and responsive layouts

Microsoft Entra ID authentication

Live backend API integration

Real findings and dashboard statistics

Timeline filtering and incident details

Alert settings integration

CSV/PDF report generation

Azure infrastructure provisioned and validated

GitHub Actions checks

Authorized deployment to the selected Azure hosting service

End-to-end testing with real cloud events

Team Responsibilities

The project is developed collaboratively. The frontend/DevOps workstream
covers the dashboard, identity integration, API consumption,
infrastructure automation, and CI/CD coordination. Backend event
collection, detection, persistence, and alerting must follow the
responsibilities and interfaces agreed by the team.

Coordinate API schemas, Azure resource ownership, environment
configuration, and deployment permissions before merging cross-team
integration changes.

Contributing

Create a feature branch for your change.

Keep changes focused and consistent with the existing project
structure.

Update types and documentation when API contracts change.

Run the available lint, type-check, test, and build commands.

Open a pull request with a clear summary and testing notes.

Do not commit secrets, local environment files, or generated
credentials.

License

Add the project's selected license here before public distribution.
