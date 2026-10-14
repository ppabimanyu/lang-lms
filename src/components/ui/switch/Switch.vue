<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import {
  SwitchRoot,
  SwitchThumb,
} from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    checked?: boolean
    disabled?: boolean
    id?: string
    name?: string
    required?: boolean
    class?: HTMLAttributes['class']
  }>(),
  {
    modelValue: undefined,
    checked: undefined,
    disabled: false,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:checked', value: boolean): void
}>()

const isChecked = computed(() => {
  if (props.modelValue !== undefined) return props.modelValue
  if (props.checked !== undefined) return props.checked
  return false
})

function handleUpdate(val: boolean) {
  emit('update:modelValue', val)
  emit('update:checked', val)
}
</script>

<template>
  <SwitchRoot
    :model-value="isChecked"
    :disabled="disabled"
    :id="id"
    :name="name"
    :required="required"
    @update:model-value="handleUpdate"
    :class="
      cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-muted-foreground/30',
        props.class,
      )
    "
  >
    <SwitchThumb
      :class="
        cn(
          'pointer-events-none block size-5 rounded-full bg-white shadow-md ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
        )
      "
    />
  </SwitchRoot>
</template>
