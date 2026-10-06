<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCounterStore } from '@/stores/counter'

const counterStore = useCounterStore()
const { count, doubleCount } = storeToRefs(counterStore)
const { increment } = counterStore
</script>

<template>
  <div class="pinia-demo">
    <p>
      Current count: <strong>{{ count }}</strong> (doubled: <strong>{{ doubleCount }}</strong>)
    </p>
    <button type="button" class="btn" @click="increment">Increment Count</button>
  </div>
</template>

<style scoped>
.pinia-demo {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
}

.btn {
  background-color: hsla(160, 100%, 37%, 0.15);
  color: hsla(160, 100%, 37%, 1);
  border: 1px solid hsla(160, 100%, 37%, 0.3);
  border-radius: 6px;
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:hover {
  background-color: hsla(160, 100%, 37%, 0.25);
  border-color: hsla(160, 100%, 37%, 0.5);
}
</style>
