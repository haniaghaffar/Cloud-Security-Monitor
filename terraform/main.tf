resource "azurerm_resource_group" "frontend" {
  name     = "rg-${var.project_name}-${var.environment}"
  location = var.location

  tags = {
    Project     = "Cloud Security Monitor"
    Component   = "Frontend"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

resource "azurerm_static_web_app" "frontend" {
  name                          = "${var.project_name}-${var.environment}"
  resource_group_name           = azurerm_resource_group.frontend.name
  location                      = azurerm_resource_group.frontend.location
  sku_tier                      = "Free"
  sku_size                      = "Free"
  public_network_access_enabled = true

  tags = {
    Project     = "Cloud Security Monitor"
    Component   = "Frontend"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
