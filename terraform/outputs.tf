output "resource_group_name" {
  description = "Resource group containing only the frontend hosting resource."
  value       = azurerm_resource_group.frontend.name
}

output "static_web_app_name" {
  description = "Azure Static Web App name, used by the deployment workflow."
  value       = azurerm_static_web_app.frontend.name
}

output "static_web_app_url" {
  description = "HTTPS URL for the deployed React frontend."
  value       = "https://${azurerm_static_web_app.frontend.default_host_name}"
}

output "static_web_app_hostname" {
  description = "Default Azure Static Web Apps hostname."
  value       = azurerm_static_web_app.frontend.default_host_name
}
