<script setup lang="ts">
import { ref } from 'vue';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const props = withDefaults(
  defineProps<{
    beehiivPublicationId: string;
    /** `ink` restyles the form for placement on the dark band. */
    tone?: 'paper' | 'ink';
  }>(),
  { tone: 'paper' },
);

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const email = ref('');
const status = ref<'idle' | 'submitting' | 'success' | 'error'>('idle');

async function handleSubmit() {
  if (!email.value || !props.beehiivPublicationId) {
    status.value = 'error';
    return;
  }

  status.value = 'submitting';

  try {
    const response = await fetch(
      `https://api.beehiiv.com/v2/publications/${props.beehiivPublicationId}/subscriptions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.value, reactivate_existing: false }),
      },
    );

    if (!response.ok) throw new Error('Subscription failed');

    status.value = 'success';
    window.gtag?.('event', 'sign_up', { method: 'newsletter' });
    window.fbq?.('track', 'Lead');
  } catch {
    status.value = 'error';
  }
}
</script>

<template>
  <div>
    <form class="flex flex-col gap-3 sm:flex-row" @submit.prevent="handleSubmit">
      <Input
        v-model="email"
        type="email"
        required
        placeholder="you@example.com"
        aria-label="Email address"
        :disabled="status === 'submitting' || status === 'success'"
        :class="[
          'h-12 flex-1 rounded-md px-4 text-base',
          tone === 'ink'
            ? 'border-white/20 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-white/40'
            : 'border-border bg-surface placeholder:text-muted-foreground/70',
        ]"
      />
      <Button
        type="submit"
        :disabled="status === 'submitting' || status === 'success'"
        :class="[
          'eyebrow h-12 rounded-md px-7 transition-colors',
          tone === 'ink'
            ? 'bg-brand-soft text-ink hover:bg-brand-soft/85'
            : 'bg-primary text-primary-foreground hover:bg-brand',
        ]"
      >
        {{ status === 'submitting' ? 'Sending' : status === 'success' ? 'Subscribed' : 'Subscribe' }}
      </Button>
    </form>

    <p
      v-if="status === 'error'"
      class="mt-3 text-sm"
      :class="tone === 'ink' ? 'text-red-300' : 'text-destructive'"
      role="alert"
    >
      Something went wrong. Please try again.
    </p>
    <p
      v-else-if="status === 'success'"
      class="mt-3 text-sm"
      :class="tone === 'ink' ? 'text-white/70' : 'text-muted-foreground'"
      role="status"
    >
      Thanks — check your inbox to confirm your subscription.
    </p>
    <p
      v-else
      class="mt-3 text-sm"
      :class="tone === 'ink' ? 'text-white/50' : 'text-muted-foreground'"
    >
      No spam. Unsubscribe in one click.
    </p>
  </div>
</template>
