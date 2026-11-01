# Cloud Security Monitor

<p align="center">
  <strong>A Cloud-Native Security Monitoring & Threat Detection Platform</strong><br />
  Monitor cloud activity, detect suspicious behaviour, and investigate security incidents through a centralized dashboard.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Cloud-Microsoft%20Azure-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white" />
  <img src="https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Styling-Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/IaC-Terraform-7B42BC?style=for-the-badge&logo=terraform&logoColor=white" />
</p>

---

## Overview

**Cloud Security Monitor** is a cloud security monitoring solution designed to help teams gain visibility into cloud activity, identify potentially malicious behaviour, and investigate security incidents through a centralized dashboard.

The platform follows a detection-and-monitoring workflow:

1. Collect cloud activity and security logs.
2. Process events using security detection rules.
3. Identify suspicious activities and generate security findings.
4. Assign severity levels to detected threats.
5. Store findings for investigation and tracking.
6. Display security insights through an interactive dashboard.
7. Support alerts and reporting for security monitoring.

The project uses **Microsoft Azure** as its cloud platform.

## Key Features

### 1. Security Overview Dashboard

Provides a centralized view of the cloud security posture, including:

* Total monitored events
* Threats detected today
* Severity distribution
* Top risky IP addresses
* Recent security findings

### 2. Threat Timeline

Displays security findings chronologically with filtering options:

* Date and time range
* Severity level
* Event type
* Finding status

### 3. Incident Details

Provides detailed information about individual security incidents:

* Event timestamp
* Event type
* Severity level
* User or role involved
* Source IP address
* Region or country
* Description of suspicious activity
* Reason for detection
* Recommended actions
* Incident status

### 4. Alert Settings

Provides configuration options for selecting severity levels that should trigger notifications.

### 5. Reports

Supports security reporting with CSV and PDF export functionality.

### 6. Authentication

Designed to integrate with **Microsoft Entra ID** for secure user authentication.

## Threat Detection Scenarios

The system is designed to identify suspicious cloud activities, including:

| Detection Scenario       | Description                                                    |
| ------------------------ | -------------------------------------------------------------- |
| Repeated Failed Logins   | Detects multiple unsuccessful authentication attempts.         |
| Unusual Login Region     | Identifies access from unexpected geographical locations.      |
| Privileged Account Usage | Monitors potentially risky use of privileged accounts.         |
| IAM / Role Changes       | Detects unexpected permission changes or privilege escalation. |
| Public Security Group    | Identifies security rules exposed to `0.0.0.0/0`.              |
| Public Storage Access    | Detects potentially unintended public storage exposure.        |
| Logging Disabled         | Identifies attempts to disable or modify security logging.     |

## Severity Levels

| Severity | Description                                       |
| -------- | ------------------------------------------------- |
| Critical | Requires immediate investigation and response.    |
| High     | Represents a significant security risk.           |
| Medium   | Suspicious activity requiring investigation.      |
| Low      | Lower-priority activity that should be monitored. |

## System Architecture

The project follows an Azure-oriented architecture designed to collect, process, analyze, and present cloud security events.

```text
        Cloud Activity & Logs
                 |
                 v
          Azure Log Sources
                 |
                 v
       Processing & Detection
          Azure Functions
                 |
                 v
          Findings Storage
           Azure Cosmos DB
                 |
                 v
           Backend API
                 |
                 v
       React Security Dashboard
                 |
                 v
        Microsoft Entra ID

          Alert Notifications
          Azure Alert Services
```

### Azure Technology Mapping

| Component                 | Azure Technology     |
| ------------------------- | -------------------- |
| Activity Monitoring       | Azure Activity Logs  |
| Log Storage               | Azure Blob Storage   |
| Event Processing          | Azure Functions      |
| Findings Storage          | Azure Cosmos DB      |
| API Management            | Azure API Management |
| Authentication            | Microsoft Entra ID   |
| Infrastructure Automation | Terraform            |
| CI/CD                     | GitHub Actions       |

*Note: Final Azure service selection and deployment depend on the team's implemented architecture.*

## Technology Stack

| Category               | Technology                |
| ---------------------- | ------------------------- |
| Frontend               | React                     |
| Programming Language   | TypeScript                |
| Build Tool             | Vite                      |
| Styling                | Tailwind CSS              |
| Authentication         | Microsoft Entra ID / MSAL |
| Cloud Platform         | Microsoft Azure           |
| Infrastructure as Code | Terraform                 |
| CI/CD                  | GitHub Actions            |
| Backend Communication  | REST API                  |

## Project Structure

```text
cloud-security-monitor/
│
├── public/
│
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
│   │
│   ├── services/
│   │   ├── api/
│   │   └── auth/
│   │
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
│
├── infrastructure/
│   └── terraform/
│
├── .github/
│   └── workflows/
│
├── .env.example
├── package.json
└── README.md
```

*The actual repository structure may differ.*

## Getting Started

### Prerequisites

Make sure you have installed:

* Node.js
* npm
* Git
* Access to the configured backend API
* Microsoft Entra ID application configuration (for authentication)

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd cloud-security-monitor
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=
VITE_AUTH_CLIENT_ID=
VITE_AUTH_TENANT_ID=
```

| Variable              | Purpose                           |
| --------------------- | --------------------------------- |
| `VITE_API_BASE_URL`   | Backend API base URL              |
| `VITE_AUTH_CLIENT_ID` | Microsoft Entra ID application ID |
| `VITE_AUTH_TENANT_ID` | Microsoft Entra ID tenant ID      |

**Security Note:** Never store client secrets, passwords, private keys, or other confidential credentials in frontend environment variables.

### 4. Run the Development Server

```bash
npm run dev
```

Open the local URL provided by Vite.

### 5. Build for Production

```bash
npm run build
```

## Backend Integration

The frontend communicates with the backend through a centralized API service layer.

The expected security finding structure includes:

```ts
interface SecurityFinding {
  finding_id: string;
  timestamp: string;
  event_type: string;
  severity: "low" | "medium" | "high" | "critical";
  user_or_role: string;
  source_ip: string;
  region?: string;
  country?: string;
  description: string;
  status: "open" | "reviewed" | "resolved";
}
```

The final API endpoints, authentication requirements, and response structures must follow the contract agreed upon by the frontend and backend teams.

## Infrastructure & CI/CD

The DevOps workflow is designed around:

* Terraform for infrastructure as code.
* Azure resources for cloud deployment.
* GitHub Actions for automated workflows.
* Automated linting and TypeScript validation.
* Production build verification.
* Infrastructure formatting and validation.
* Controlled deployment workflows.

Infrastructure changes should be reviewed before applying them to the Azure environment.

## Security Considerations

* Secure authentication through Microsoft Entra ID.
* Environment-based configuration.
* No hardcoded credentials or secrets.
* HTTPS communication.
* Secure API integration.
* Backend-side authorization and validation.
* Least-privilege access to cloud resources.
* Terraform configuration review.
* Dependency security checks.

## Project Status

Implementation and integration status should be updated as each component is completed and verified.

* [ ] Frontend Dashboard
* [ ] Threat Timeline
* [ ] Incident Details
* [ ] Alert Settings
* [ ] Reports and Export Functionality
* [ ] Microsoft Entra ID Authentication
* [ ] Live Backend API Integration
* [ ] Azure Infrastructure
* [ ] Terraform Configuration
* [ ] GitHub Actions CI/CD
* [ ] End-to-End Testing
* [ ] Cloud Deployment

## Team Responsibilities

The project is developed collaboratively.

The frontend and DevOps workstream focuses on:

* React dashboard development.
* UI components and responsive layouts.
* Backend API integration.
* Microsoft Entra ID authentication.
* Azure infrastructure configuration.
* Terraform automation.
* GitHub Actions CI/CD.
* Frontend testing and documentation.

Backend event collection, threat detection, data storage, and alert processing are coordinated with the backend workstream.

## Contributing

Contributions are welcome.

1. Create a feature branch.
2. Implement your changes.
3. Follow the existing project structure.
4. Test your changes locally.
5. Submit a pull request with a clear description.

## License

This project is developed for educational and academic purposes.
