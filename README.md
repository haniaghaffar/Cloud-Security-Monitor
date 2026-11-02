# Cloud Security Monitor

<p align="center">
  <strong>Azure-Based Cloud Security Monitoring & Threat Detection Platform</strong>
  <br />
  Monitor cloud activity, detect suspicious behaviour, investigate security incidents, and manage security findings through a centralized dashboard.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Cloud-Microsoft%20Azure-0078D4?style=for-the-badge&logo=microsoftazure&logoColor=white" />
  <img src="https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Backend-Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Functions-Azure%20Functions-0062AD?style=for-the-badge&logo=azurefunctions&logoColor=white" />
  <img src="https://img.shields.io/badge/Styling-Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

---

## Overview

**Cloud Security Monitor** is a cloud security monitoring platform designed to help organizations monitor Azure cloud activity, identify suspicious behaviour, and investigate potential security threats.

The system processes Azure Activity Log data through an automated detection engine and generates structured security findings. These findings are stored in Azure Table Storage and presented through an interactive React dashboard.

The platform also supports email notifications for High and Critical severity findings through Resend.

The main goal is to provide a centralized security monitoring experience that makes cloud threats easier to detect, understand, track, and investigate.

## Key Features

### 1. Security Overview Dashboard

Provides a centralized overview of cloud security activity, including:

* Total security findings
* Threat activity overview
* Severity distribution
* Risk-related statistics
* Recent security findings

### 2. Threat Monitoring

Displays detected security events and findings in a structured format.

Users can review security activity and identify potentially suspicious behaviour.

### 3. Incident Details

Provides detailed information about individual security findings, including:

* Finding ID
* Timestamp
* Event type
* Severity level
* User or role involved
* Source IP address
* Region information, when available
* Description of suspicious activity
* Finding status

### 4. Alert Management

Provides an interface for managing alert-related settings.

The backend sends email notifications through Resend when findings meet the configured High or Critical severity conditions.

### 5. Reports & Export

Allows users to export security reports in:

* CSV format
* PDF format

### 6. Resource Monitoring

Includes a resource inventory interface for cloud resource visibility.

Live resource inventory API availability is not yet confirmed; the interface should communicate unavailable data rather than present fabricated resource information.

### 7. Settings

Provides a centralized interface for application configuration and available settings.

### 8. Authentication Interface

Includes a login interface.

Microsoft Entra ID integration is part of the intended authentication direction, but backend token validation and complete secure authentication are not yet implemented.

---

## Threat Detection Engine

The backend processes Azure Activity Log files and evaluates events using seven detection rules.

The supported detection scenarios include:

| # | Detection Scenario          | Description                                                                |
| - | --------------------------- | -------------------------------------------------------------------------- |
| 1 | Repeated Failed Logins      | Identifies repeated unsuccessful authentication attempts.                  |
| 2 | Unusual Region Login        | Detects potentially suspicious access from unusual geographical locations. |
| 3 | Public Storage Access       | Identifies potentially exposed storage resources.                          |
| 4 | Public Security Group       | Detects security group exposure to the public internet.                    |
| 5 | Logging Disabled            | Identifies attempts to disable or modify security logging.                 |
| 6 | Privileged Account Activity | Monitors potentially risky privileged account usage.                       |
| 7 | IAM / Permission Changes    | Identifies suspicious permission or access changes.                        |

*Detection rule names and conditions should follow the actual backend implementation.*

## Severity Levels

Each security finding is assigned a severity level to help prioritize investigation.

| Severity | Description                                       |
| -------- | ------------------------------------------------- |
| Critical | Immediate investigation is required.              |
| High     | Represents a significant security risk.           |
| Medium   | Suspicious activity requiring review.             |
| Low      | Lower-priority activity that should be monitored. |

---

## System Architecture

The project follows an Azure-oriented architecture in which cloud activity is processed by an automated backend detection engine.

```text
             Azure Activity Logs
                      |
                      v
              Activity Log Files
                      |
                      v
               Azure Functions
                      |
                      v
              Detection Engine
                (7 Rules)
                      |
                      v
              Security Findings
                      |
                      v
              Azure Table Storage
                      |
                      v
                 Backend API
                      |
                      v
              React Dashboard
                      |
              +-------+-------+
              |               |
              v               v
         CSV / PDF       Security Alerts
          Reports         via Resend
```

### Architecture Components

| Component             | Technology          | Responsibility                              |
| --------------------- | ------------------- | ------------------------------------------- |
| Cloud Activity Source | Azure Activity Logs | Provides cloud activity information.        |
| Event Processing      | Azure Functions     | Processes activity log files.               |
| Detection Engine      | Python              | Evaluates events against detection rules.   |
| Findings Storage      | Azure Table Storage | Stores generated security findings.         |
| Email Notifications   | Resend              | Sends High and Critical finding alerts.     |
| Frontend              | React               | Displays security information and findings. |
| API Communication     | REST API            | Connects frontend with backend services.    |

---

## Technology Stack

### Frontend

| Technology   | Purpose                                |
| ------------ | -------------------------------------- |
| React        | Component-based user interface         |
| TypeScript   | Type-safe development                  |
| Vite         | Frontend development and build tooling |
| Tailwind CSS | Responsive UI styling                  |

### Backend

| Technology          | Purpose                     |
| ------------------- | --------------------------- |
| Python              | Backend development         |
| Azure Functions     | Serverless event processing |
| Azure Activity Logs | Cloud activity monitoring   |
| Azure Table Storage | Security findings storage   |
| Resend              | Email notifications         |

### Infrastructure & DevOps

| Technology      | Purpose                   |
| --------------- | ------------------------- |
| Microsoft Azure | Cloud platform            |
| Terraform       | Infrastructure as Code    |
| GitHub Actions  | Intended CI/CD automation |

*Terraform configuration exists in the repository. Actual infrastructure provisioning and GitHub Actions deployment should be verified separately.*

---

## Project Structure

The repository is organized into frontend, backend, infrastructure, and documentation components.

```text
Cloud-Security-Monitor/
│
├── backend/
│   ├── requirements.txt
│   └── README.md
│
├── docs/
│   └── BACKEND_INTEGRATION.md
│
├── terraform/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── hooks/
│   ├── types/
│   └── utils/
│
├── public/
│
├── package.json
├── README.md
└── ...
```

*This is a high-level representation. Refer to the actual repository for the complete directory structure.*

---

## Getting Started

Follow the instructions below to set up the project locally.

### Prerequisites

Make sure the following tools are installed:

* Node.js
* npm
* Python
* Git
* Azure Functions Core Tools (for local backend execution)
* Access to the required Azure resources and configuration

### 1. Clone the Repository

```bash
git clone https://github.com/haniaghaffar/Cloud-Security-Monitor.git
cd Cloud-Security-Monitor
```

### 2. Frontend Setup

Install frontend dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in the terminal.

### 3. Build Frontend

To generate the production build:

```bash
npm run build
```

### 4. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv .venv
```

Activate the environment.

**Windows:**

```bash
.venv\Scripts\activate
```

**Linux / macOS:**

```bash
source .venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

For local Azure Functions execution, configure the required application settings and local environment according to `backend/README.md`, then run:

```bash
func start
```

*Azure Functions Core Tools and the required local configuration must be available before running this command.*

---

## Backend API

The backend exposes API functionality for communicating security findings and dashboard information to the frontend.

The documented API capabilities include:

| API Capability     | Purpose                          |
| ------------------ | -------------------------------- |
| Findings List      | Retrieves security findings.     |
| Finding Details    | Retrieves an individual finding. |
| Dashboard Overview | Provides dashboard statistics.   |
| Alert Settings     | Handles alert-related settings.  |

The backend README contains the documented API routes and deployed Azure Function App information.

**API Integration Note:** The exact API paths, response schemas, and frontend integration status must be confirmed against `docs/BACKEND_INTEGRATION.md` and the actual backend implementation. Proposed integration contracts should not be treated as verified production endpoints.

---

## Database & Data Model

Azure Table Storage is used to store generated security findings.

A finding contains information such as:

* Finding identifier
* Timestamp
* Event type
* Severity
* User or role
* Source IP address
* Region information
* Description
* Finding status

### Finding Status

| Status   | Meaning                         |
| -------- | ------------------------------- |
| Open     | Finding requires investigation. |
| Reviewed | Finding has been reviewed.      |
| Resolved | Finding has been addressed.     |

---

## Email Alert System

The backend integrates with **Resend** for email notifications.

When a finding meets the configured High or Critical severity conditions, the backend sends an email notification.

This helps ensure that important security events receive attention without requiring users to continuously monitor the dashboard.

---

## Authentication & Security

The project includes a login interface and is intended to support Microsoft Entra ID authentication.

However, the current backend API is documented as operating in **anonymous demo mode**.

Complete Entra ID token validation and secure backend authorization are not yet implemented.

### Security Considerations

* Do not expose API keys or credentials in frontend code.
* Keep sensitive configuration outside the source code.
* Use secure environment variables.
* Validate incoming API requests.
* Implement backend-side authentication and authorization.
* Use HTTPS for deployed application traffic.
* Apply least-privilege access to Azure resources.
* Review infrastructure changes before deployment.

**Important:** A frontend login interface alone does not provide backend security. API authentication and authorization must be enforced by the backend.

---

## Infrastructure & Deployment

The repository includes Terraform configuration for infrastructure management.

Terraform is intended to support repeatable Azure infrastructure provisioning.

Before deployment:

1. Configure the correct Azure subscription.
2. Review the Terraform provider and resource configuration.
3. Configure the required environment variables and credentials securely.
4. Validate the Terraform configuration.
5. Review the execution plan.
6. Apply infrastructure changes only after approval.

GitHub Actions is intended for automated validation and deployment workflows. Actual workflow implementation and deployment status should be confirmed in the repository.

---

## Current Implementation Status

| Component                              | Status         |
| -------------------------------------- | -------------- |
| React Frontend                         | Implemented    |
| Dashboard Pages                        | Implemented    |
| Backend Azure Functions                | Implemented    |
| Activity Log Processing                | Implemented    |
| Threat Detection Rules                 | Implemented    |
| Azure Table Storage Integration        | Implemented    |
| Resend Email Alerts                    | Implemented    |
| Findings API                           | Documented     |
| CSV / PDF Export Interface             | Implemented    |
| Resource Inventory API                 | Not confirmed  |
| Entra ID Token Validation              | Pending        |
| Secure API Authorization               | Pending        |
| Complete Frontend-Backend Verification | To be verified |
| Terraform Deployment                   | To be verified |
| GitHub Actions CI/CD                   | To be verified |

*Status reflects the available project documentation and implementation review. It should be updated after end-to-end testing.*

---

## Future Improvements

Potential improvements include:

* Complete Microsoft Entra ID authentication and backend token validation.
* Implement secure API authorization.
* Complete and verify frontend-backend integration.
* Expand cloud resource inventory capabilities.
* Improve threat detection rules.
* Add advanced anomaly detection.
* Introduce automated incident response.
* Add additional notification channels.
* Complete automated CI/CD deployment.
* Improve security analytics and reporting.

---

## Team Responsibilities

Cloud Security Monitor is a collaborative software engineering project.

The project work includes:

* Frontend development and dashboard design.
* Backend development and event processing.
* Cloud security monitoring.
* Threat detection and findings management.
* API integration.
* Azure infrastructure configuration.
* Testing, documentation, and deployment coordination.

---

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Implement your changes.
4. Test the implementation.
5. Submit a pull request with a clear description.

Please avoid committing credentials, API keys, local environment files, or other sensitive information.

---

## License

This project is developed for educational and academic purposes.
