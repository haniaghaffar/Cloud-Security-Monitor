variable "subscription_id" {
  description = "Azure subscription ID. May be supplied with ARM_SUBSCRIPTION_ID instead."
  type        = string
  default     = null
  nullable    = true
}

variable "project_name" {
  description = "Lowercase project prefix used in Azure resource names."
  type        = string
  default     = "csm-frontend"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name)) && length(var.project_name) <= 35
    error_message = "project_name must contain only lowercase letters, numbers, and hyphens, and be at most 35 characters."
  }
}

variable "environment" {
  description = "Deployment environment used in resource names and tags."
  type        = string
  default     = "development"

  validation {
    condition     = contains(["development", "production"], var.environment)
    error_message = "environment must be development or production."
  }
}

variable "location" {
  description = "Azure region for the frontend resource group and Static Web App."
  type        = string
  default     = "Central US"
}
