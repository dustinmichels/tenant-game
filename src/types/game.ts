export interface Tenant {
  id: string
  buildingId: string
  variant: number
}

export interface Building {
  id: string
  index: number
  label: string
  tenants: Tenant[]
}

export interface GameState {
  buildingCount: number
  peoplePerBuilding: number
  isConfigured: boolean
  buildings: Building[]
  updatedAt: number
}
