# Cloud Security Monitor (CSM)

**An Azure-based cloud security monitoring and threat detection platform.**

Cloud Security Monitor (CSM) is a security monitoring solution designed to identify suspicious activities in cloud environments by analyzing Azure Activity Logs and detecting potentially malicious operations through predefined security rules.

The platform provides a centralized dashboard where users can monitor security findings, investigate threats, track suspicious IP addresses, manage email alert settings, generate reports, and view Azure resource inventory.

---

## 1. Project Overview

Cloud Security Monitor automates the process of monitoring cloud activity and identifying potential security threats.

It collects cloud activity logs, processes and normalizes events, applies security detection rules, and generates findings that are stored for further investigation.

The frontend provides a centralized interface for monitoring security events, while the backend handles log ingestion, event processing, threat detection, storage, authentication, and API services.

### Key Objectives

* Monitor cloud activities in real time or through available log ingestion.
* Detect suspicious and potentially malicious activities.
* Identify security misconfigurations and unauthorized changes.
* Generate security findings based on predefined detection rules.
* Provide centralized security monitoring through a web dashboard.
* Send email notifications for high-severity and critical findings.
* Generate downloadable security reports.
* Provide visibility into Azure resource inventory.

---

## 2. Technology Stack

### Frontend

| Technology                              | Purpose                             |
| --------------------------------------- | ----------------------------------- |
| React                                   | Frontend application development    |
| TypeScript                              | Type-safe application development   |
| Vite                                    | Development server and build tool   |
| Tailwind CSS                            | Styling and responsive layouts      |
| Microsoft Entra ID                      | User authentication                 |
| Microsoft Authentication Library (MSAL) | Authentication and access tokens    |
| Recharts                                | Dashboard charts and visualizations |

### Backend

| Technology             | Purpose                                   |
| ---------------------- | ----------------------------------------- |
| Python                 | Backend development                       |
| Azure Functions        | Serverless execution and event processing |
| Azure Blob Storage     | Activity log ingestion                    |
| Azure Table Storage    | Security findings storage                 |
| Azure Resource Manager | Azure resource inventory                  |
| Microsoft Entra ID     | API authentication                        |
| Resend                 | Email notifications                       |

### Infrastructure & Deployment

* Microsoft Azure
* Azure Functions
* Azure Blob Storage
* Azure Table Storage
* Azure Resource Manager
* Terraform
* Azure App Service / Function App infrastructure

---

## 3. System Architecture

The application follows a frontend-backend architecture.

### High-Level Workflow

1. Azure Activity Logs are exported to Azure Blob Storage.
2. Azure Functions detect newly uploaded log files.
3. The backend parser reads and normalizes incoming events.
4. The detection engine evaluates events against predefined security rules.
5. Suspicious activities are converted into security findings.
6. Findings are stored in Azure Table Storage.
7. High and Critical findings can trigger email notifications.
8. The REST API provides findings, statistics, alert settings, and resource inventory.
9. The React frontend retrieves and displays this information through the dashboard.

### Architecture Flow

```text
        Azure Environment
                |
                v
        Azure Activity Logs
                |
                v
        Azure Blob Storage
                |
                v
        Azure Functions
                |
                v
         Event Parser
                |
                v
       Detection Engine
                |
                v
        Security Findings
                |
                v
       Azure Table Storage
                |
          +-----+------+
          |            |
          v            v
      Email Alerts   REST API
                       |
                       v
                React Frontend
                       |
                       v
              Security Dashboard
```

---

## 4. Frontend Features

The frontend is developed using React, TypeScript, and Vite.

It provides a centralized interface for accessing security information and managing monitoring activities.

### 4.1 Authentication

* Microsoft Entra ID authentication.
* Secure sign-in through MSAL.
* Protected application routes.
* Access tokens attached to authenticated API requests.
* Unauthorized users cannot access protected dashboard pages.

### 4.2 Security Dashboard

The dashboard provides an overview of the cloud security environment.

**Dashboard Metrics:**

* Total Security Findings
* Today's Threats
* Open Incidents
* Critical Findings

**Visualizations:**

* Security severity distribution.
* Recent security activity.
* Risky IP addresses.
* Security event overview.
* Backend connection health.

### 4.3 Findings & Threat Timeline

The Findings section provides detailed information about detected security events.

**Features:**

* View security findings.
* Search findings.
* Filter by severity.
* Filter by event type.
* Filter by status.
* Filter by date range.
* Navigate through paginated results.
* Export findings to CSV.

### 4.4 Finding Details

Users can investigate individual security findings.

Available information includes:

* Finding ID.
* Event timestamp.
* Severity level.
* Event type.
* Associated user or role.
* Source IP address.
* Geographic region.
* Detection rule.
* Available raw event information.

### 4.5 Alerts Management

The Alerts section provides access to email alert configuration.

**Features:**

* View alert settings.
* Manage available recipient settings.
* View severity-based alert configuration.

The backend uses Resend for email delivery.

High and Critical severity findings can trigger email notifications, depending on backend configuration.

### 4.6 Security Reports

The Reports section allows users to generate security reports.

**Features:**

* Filter by date range.
* Filter by severity.
* Filter by finding status.
* Export reports as CSV.
* Download PDF reports.

For report generation, matching findings are retrieved across all relevant backend pagination pages.

### 4.7 Azure Resources

The Resources section displays Azure resource inventory.

**Available Information:**

* Resource name.
* Resource type.
* Azure location.
* Resource group.

Resource information is retrieved through Azure Resource Manager.

This section provides resource inventory visibility and does not claim to provide live resource health monitoring.

### 4.8 Settings

The Settings page provides application configuration and connectivity information.

**Features:**

* API base URL information.
* Microsoft Entra ID configuration.
* Backend connection health.
* Application configuration visibility.

---

## 5. Backend Architecture

The backend is developed using Python and Azure Functions.

It handles the complete security event processing pipeline, from log ingestion to finding generation and API delivery.

### 5.1 Log Ingestion

Azure Activity Logs are exported to Azure Blob Storage.

The backend monitors configured storage containers, including:

* `logs`
* `insights-activity-logs`

When a new log file is uploaded, the corresponding Azure Function processes it through a Blob Trigger.

### 5.2 Event Parsing

The parser extracts relevant information from incoming log events and converts them into a normalized format.

Supported event formats include:

* Azure Activity Log events.
* CloudTrail-style events.

Normalization allows the detection engine to evaluate events using a consistent structure.

### 5.3 Detection Engine

The detection engine evaluates normalized events against predefined security rules.

When an event matches a detection rule, the backend generates a security finding with relevant information, including:

* Finding ID.
* Event type.
* Severity.
* Timestamp.
* User or role.
* Source IP.
* Region.
* Detection rule.
* Event details.

### 5.4 Findings Storage

Generated security findings are stored in Azure Table Storage.

New findings receive an initial status of:

`open`

The stored findings are retrieved through backend API endpoints and displayed on the frontend dashboard.

### 5.5 Email Notifications

The backend integrates with Resend for email notifications.

High and Critical severity findings can trigger email alerts.

The recipient email address is configured through the backend environment variable:

`ALERT_TO_EMAIL`

Email delivery depends on the configured Resend credentials and backend environment settings.

---

## 6. Security Detection Rules

The detection engine includes predefined rules for identifying suspicious cloud activities.

| Detection Rule         | Description                                                          | Severity |
| ---------------------- | -------------------------------------------------------------------- | -------- |
| Root Account Activity  | Detects activity performed using a root account.                     | Critical |
| Logging Disabled       | Detects disabling or deleting logging and diagnostic configurations. | Critical |
| Public Storage Changes | Detects changes that may expose storage resources publicly.          | High     |
| Security Group Changes | Detects potentially risky network security rule modifications.       | High     |
| IAM / Role Changes     | Detects IAM, role, policy modifications, or user creation.           | High     |
| Failed Login Attempts  | Detects 5 or more failed login attempts by the same user.            | High     |
| New Region Login       | Detects successful login activity from a new region for a user.      | Medium   |

Detection rules are implemented in:

`backend/csm/rules.py`

The detection engine evaluates incoming events and generates findings when configured conditions are satisfied.

---

## 7. Backend API Endpoints

The frontend communicates with the backend through REST API endpoints.

| HTTP Method | Endpoint               | Description                                                                  |
| ----------- | ---------------------- | ---------------------------------------------------------------------------- |
| GET         | `/api/findings`        | Retrieves security findings with search, filtering, sorting, and pagination. |
| GET         | `/api/findings/{id}`   | Retrieves details of an individual finding.                                  |
| GET         | `/api/stats/overview`  | Returns dashboard statistics, risky IPs, and recent findings.                |
| GET         | `/api/resources`       | Retrieves Azure resource inventory.                                          |
| GET         | `/api/alerts/settings` | Retrieves alert configuration.                                               |
| PUT         | `/api/alerts/settings` | Updates available alert settings.                                            |

### API Authentication

The application uses Microsoft Entra ID for authentication.

The frontend obtains an access token through MSAL and attaches it to authenticated API requests.

The backend validates the access token before processing protected requests.

Authentication is enforced at the API level rather than relying only on frontend route protection.

---

## 8. Project Directory Structure

```text
Cloud Security Monitor/
│
├── src/
│   ├── components/
│   │   └── auth/
│   │       └── ProtectedRoute.tsx
│   │
│   ├── hooks/
│   │   ├── useFindings.ts
│   │   └── useBackendHealth.ts
│   │
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── FindingsPage.tsx
│   │   ├── FindingDetailsPage.tsx
│   │   ├── AlertsPage.tsx
│   │   ├── ReportsPage.tsx
│   │   ├── ResourcesPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── LoginPage.tsx
│   │
│   ├── services/
│   │   └── securityService.ts
│   │
│   └── App.tsx
│
├── backend/
│   ├── csm/
│   │   ├── api.py
│   │   ├── auth.py
│   │   ├── emailer.py
│   │   ├── parser.py
│   │   ├── resources.py
│   │   ├── rules.py
│   │   └── store.py
│   │
│   ├── function_app.py
│   └── README.md
│
├── terraform/
│   └── main.tf
│
├── docs/
│   └── BACKEND_INTEGRATION.md
│
├── vite.config.js
├── package.json
└── README.md
```

---

## 9. Installation & Setup

### Prerequisites

Before running the project, make sure you have:

* Node.js and npm.
* Python (for local backend development).
* Microsoft Azure account.
* Microsoft Entra ID application registration.
* Required Azure resources and permissions.
* Configured backend environment variables.

### 9.1 Clone the Repository

```bash
git clone <repository-url>
```

Navigate to the project directory:

```bash
cd "Cloud Security Monitor"
```

### 9.2 Frontend Installation

Install the frontend dependencies:

```bash
npm install
```

### 9.3 Environment Configuration

Create a `.env` file in the project root.

Configure the frontend API URL and Microsoft Entra ID settings according to the project's existing environment variable names and configuration.

Example:

```env
VITE_API_BASE_URL=https://<your-function-app>.azurewebsites.net
```

Configure the required Entra ID values using the variable names expected by the frontend application.

**Important:**

* Never expose client secrets in frontend environment variables.
* Never hardcode access tokens.
* Keep sensitive credentials in secure backend configuration.
* Do not commit `.env` files to GitHub.

### 9.4 Run Frontend

Start the Vite development server:

```bash
npm run dev
```

The frontend will generally be available at:

```text
http://localhost:5173
```

---

## 10. Backend Configuration

The backend is deployed as an Azure Function App.

Its configuration requires the appropriate Azure resources and environment variables.

### Main Backend Dependencies

* Azure Functions runtime.
* Azure Blob Storage.
* Azure Table Storage.
* Microsoft Entra ID authentication configuration.
* Azure Resource Manager permissions.
* Resend API configuration.

### Backend Environment Configuration

The backend requires the relevant configuration for:

* Azure Storage connection.
* Findings table storage.
* Authentication and token validation.
* Azure resource inventory access.
* Email notification service.
* Alert recipient email.

The exact variable names and required values should be taken from:

`backend/README.md`

Backend local execution requires the Azure Functions development environment and its configured application settings.

---

## 11. Azure Deployment

The backend is deployed on Microsoft Azure.

**Deployed Function App:**

`csmfunc583`

The frontend connects to the deployed backend through its HTTPS API endpoint.

### Azure Services

| Azure Service          | Responsibility                         |
| ---------------------- | -------------------------------------- |
| Azure Functions        | Backend execution and event processing |
| Azure Blob Storage     | Activity log ingestion                 |
| Azure Table Storage    | Security findings storage              |
| Azure Resource Manager | Azure resource inventory               |
| Microsoft Entra ID     | Authentication and authorization       |

Infrastructure configuration is maintained through Terraform.

Terraform configuration:

`terraform/main.tf`

---

## 12. Security Considerations

Security is an important part of the Cloud Security Monitor architecture.

The application incorporates the following security practices:

* Microsoft Entra ID authentication.
* Backend access token validation.
* Protected frontend routes.
* Authenticated API requests.
* Secure backend configuration.
* Environment-based credential management.
* Azure resource access through configured permissions.

Frontend route protection should not be considered a replacement for backend authentication and authorization.

Sensitive credentials must never be exposed in client-side code or committed to version control.

---

## 13. Current Implementation Notes & Limitations

The following implementation details are important when evaluating the current project functionality.

1. Findings can be retrieved, searched, filtered, and displayed through the API.

2. The documented API endpoints do not currently include a finding status update operation.

3. Email delivery uses the backend `ALERT_TO_EMAIL` environment variable. Changes made through the frontend recipient settings should not be assumed to change the actual delivery recipient without verifying the backend integration.

4. Azure Resources provides resource inventory information. It does not currently represent a complete live resource health monitoring system.

5. Detection is based on the predefined rules implemented in the backend. It should not be described as a machine-learning-based anomaly detection engine.

6. Real-time behavior depends on the Azure Activity Log export configuration, Blob Trigger execution, and backend processing.

7. The frontend requires valid API and Microsoft Entra ID configuration to communicate with the deployed backend.

---

## 14. Future Enhancements

Potential improvements include:

* Advanced anomaly detection using machine learning.
* More comprehensive cloud security detection rules.
* Multi-cloud security monitoring.
* Advanced threat correlation.
* Real-time threat notifications.
* Finding status management and incident resolution workflows.
* Enhanced security analytics and visualization.
* Role-based access control.
* Advanced audit logging.
* Automated security recommendations.
* Integration with additional security monitoring services.

---

## 15. Project Summary

Cloud Security Monitor provides a centralized approach to monitoring cloud security activities and identifying potentially suspicious operations.

By combining Azure Activity Log ingestion, Python-based detection rules, Azure Functions, secure REST APIs, and a React-based dashboard, the platform helps users gain visibility into cloud security events.

Its architecture separates frontend visualization from backend processing, allowing the application to support future improvements in detection capabilities, security analytics, and cloud infrastructure monitoring.

---

**Project:** Cloud Security Monitor (CSM)
**Category:** Cloud Security / Cybersecurity
**Frontend:** React, TypeScript, Vite
**Backend:** Python, Azure Functions
**Cloud Platform:** Microsoft Azure
**Authentication:** Microsoft Entra ID
**Infrastructure:** Terraform
