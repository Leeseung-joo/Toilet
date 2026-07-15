<script setup>
import { computed, useId } from "vue";

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: "",
  },

  label: {
    type: String,
    default: "",
  },

  name: {
    type: String,
    default: "",
  },

  type: {
    type: String,
    default: "text",
  },

  placeholder: {
    type: String,
    default: "",
  },

  textarea: {
    type: Boolean,
    default: false,
  },

  rows: {
    type: Number,
    default: 5,
  },

  disabled: {
    type: Boolean,
    default: false,
  },

  required: {
    type: Boolean,
    default: false,
  },

  helper: {
    type: String,
    default: "",
  },

  error: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue", "blur", "focus"]);

const generatedId = useId();

const fieldId = computed(() => {
  return props.name || generatedId;
});

const handleInput = (event) => {
  emit("update:modelValue", event.target.value);
};
</script>

<template>
  <div class="base-field">
    <label
      v-if="label"
      class="base-field__label"
      :for="fieldId"
    >
      {{ label }}

      <span v-if="required" class="base-field__required">
        *
      </span>
    </label>

    <textarea
      v-if="textarea"
      :id="fieldId"
      :name="name"
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      class="base-field__control base-field__textarea"
      :class="{ 'base-field__control--error': error }"
      @input="handleInput"
      @blur="$emit('blur', $event)"
      @focus="$emit('focus', $event)"
    />

    <input
      v-else
      :id="fieldId"
      :name="name"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      class="base-field__control"
      :class="{ 'base-field__control--error': error }"
      @input="handleInput"
      @blur="$emit('blur', $event)"
      @focus="$emit('focus', $event)"
    />

    <p v-if="error" class="base-field__error">
      {{ error }}
    </p>

    <p v-else-if="helper" class="base-field__helper">
      {{ helper }}
    </p>
  </div>
</template>

<style scoped>
.base-field {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 8px;
}

.base-field__label {
  color: var(--color-text);
  font-size: 13px;
  font-weight: 700;
}

.base-field__required {
  color: var(--color-danger);
}

.base-field__control {
  width: 100%;
  min-height: 46px;
  padding: 0 15px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  background: var(--color-surface-soft);
  color: var(--color-text);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.base-field__control::placeholder {
  color: var(--color-text-muted);
}

.base-field__control:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(7, 153, 135, 0.12);
}

.base-field__control:disabled {
  cursor: not-allowed;
  background: #f0f3f2;
  opacity: 0.75;
}

.base-field__textarea {
  min-height: 126px;
  padding-top: 14px;
  padding-bottom: 14px;
  resize: vertical;
}

.base-field__control--error {
  border-color: var(--color-danger);
}

.base-field__helper,
.base-field__error {
  margin: 0;
  font-size: 12px;
}

.base-field__helper {
  color: var(--color-text-subtle);
}

.base-field__error {
  color: var(--color-danger);
}
</style>