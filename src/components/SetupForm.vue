<script setup lang="ts">
import { ref } from 'vue'
import RoughBox from './RoughBox.vue'
import RoughButton from './RoughButton.vue'

const props = withDefaults(
  defineProps<{
    initialBuildings?: number
    initialPeople?: number
  }>(),
  {
    initialBuildings: 4,
    initialPeople: 8,
  },
)

const emit = defineEmits<{
  (e: 'submit', payload: { buildingCount: number; peoplePerBuilding: number }): void
}>()

const buildingCount = ref<number | null>(props.initialBuildings)
const peoplePerBuilding = ref<number | null>(props.initialPeople)
const errorMessage = ref('')

function handleSubmit() {
  const b = Number(buildingCount.value)
  const p = Number(peoplePerBuilding.value)

  if (!b || b < 1) {
    errorMessage.value = 'Please enter at least 1 building.'
    return
  }
  if (!p || p < 1) {
    errorMessage.value = 'Please enter at least 1 person per building.'
    return
  }

  errorMessage.value = ''
  emit('submit', {
    buildingCount: Math.floor(b),
    peoplePerBuilding: Math.floor(p),
  })
}
</script>

<template>
  <div class="setup-container">
    <RoughBox
      :stroke="'#27272a'"
      :fill="'#fcfaf6'"
      fill-style="solid"
      :roughness="1.3"
      :bowing="1.1"
      :stroke-width="1.8"
      :seed="888"
      class="setup-card-rough"
    >
      <div class="setup-card">
        <header class="setup-header">
          <div class="union-badge">Tenant Union Aid</div>
          <h1 class="setup-title">Organizing Simulation</h1>
          <p class="setup-subtitle">
            Facilitator visual setup to map your neighborhood and residents.
          </p>
        </header>

        <form class="setup-form" @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="building-count-input" class="form-label">
              <span class="label-step">1</span>
              How many buildings are there?
            </label>
            <RoughBox
              :stroke="'#52525b'"
              :fill="'#ffffff'"
              fill-style="solid"
              :roughness="1.0"
              :stroke-width="1.4"
              :seed="801"
              class="input-rough-box"
            >
              <div class="input-inner">
                <input
                  id="building-count-input"
                  v-model.number="buildingCount"
                  type="number"
                  min="1"
                  max="50"
                  class="number-input"
                  placeholder="e.g. 4"
                  required
                  autofocus
                />
                <span class="input-unit">buildings</span>
              </div>
            </RoughBox>
          </div>

          <div class="form-group">
            <label for="people-count-input" class="form-label">
              <span class="label-step">2</span>
              Typically, how many people per building?
            </label>
            <RoughBox
              :stroke="'#52525b'"
              :fill="'#ffffff'"
              fill-style="solid"
              :roughness="1.0"
              :stroke-width="1.4"
              :seed="802"
              class="input-rough-box"
            >
              <div class="input-inner">
                <input
                  id="people-count-input"
                  v-model.number="peoplePerBuilding"
                  type="number"
                  min="1"
                  max="100"
                  class="number-input"
                  placeholder="e.g. 8"
                  required
                />
                <span class="input-unit">people / bldg</span>
              </div>
            </RoughBox>
          </div>

          <div v-if="errorMessage" class="error-notice">
            {{ errorMessage }}
          </div>

          <div class="form-actions">
            <RoughButton
              type="submit"
              variant="primary"
              :seed="805"
            >
              <span class="btn-text">Generate Neighborhood</span>
              <span class="btn-arrow">→</span>
            </RoughButton>
          </div>
        </form>
      </div>
    </RoughBox>
  </div>
</template>

<style scoped>
.setup-container {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 40px 20px;
}

.setup-card-rough {
  max-width: 480px;
  width: 100%;
}

.setup-card {
  padding: 36px 32px 32px;
  display: flex;
  flex-direction: column;
}

.setup-header {
  margin-bottom: 28px;
  text-align: center;
}

.union-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #78350f;
  background: #fef3c7;
  padding: 3px 10px;
  border-radius: 999px;
  margin-bottom: 12px;
  border: 1px dashed #d97706;
}

.setup-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: #1c1917;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.setup-subtitle {
  font-size: 0.95rem;
  color: #57534e;
  line-height: 1.4;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 0.96rem;
  font-weight: 700;
  color: #292524;
  display: flex;
  align-items: center;
  gap: 8px;
}

.label-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #e7e5e4;
  font-size: 0.75rem;
  font-weight: 800;
  color: #44403c;
}

.input-rough-box {
  width: 100%;
}

.input-inner {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 6px 14px;
}

.number-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1c1917;
  outline: none;
  padding: 4px 0;
}

.input-unit {
  font-size: 0.85rem;
  color: #78716c;
  font-weight: 600;
}

.error-notice {
  font-size: 0.88rem;
  color: #b91c1c;
  background: #fef2f2;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #fecaca;
}

.form-actions {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}

.form-actions :deep(.rough-btn) {
  width: 100%;
}

.btn-text {
  font-size: 1.05rem;
  font-weight: 700;
}

.btn-arrow {
  font-size: 1.2rem;
  transition: transform 0.15s ease;
}

.form-actions :deep(.rough-btn:hover) .btn-arrow {
  transform: translateX(3px);
}
</style>
