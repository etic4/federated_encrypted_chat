<template>
  <div class="container">
    <Card>
      <CardHeader>
        <CardTitle>Register</CardTitle>
        <CardDescription>Create an account to start using our service.</CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="onSubmit">
          <div class="grid gap-4">
            <div class="space-y-2">
              <label for="username" class="text-right inline-block w-24">Username</label>
              <Input id="username" placeholder="Enter your username" v-model="username" />
            </div>
            <div class="space-y-2">
              <label for="password" class="text-right inline-block w-24">Password</label>
              <Input id="password" type="password" placeholder="Enter your password" v-model="password" />
            </div>
            <Button type="submit" :disabled="isLoading">
              {{ isLoading ? 'Registering...' : 'Register' }}
            </Button>
          </div>
        </form>
        <div v-if="errorMessage" class="text-red-500 mt-4">{{ errorMessage }}</div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { useAuth } from '~/composables/useAuth'

const username = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);
const router = useRouter();
const auth = useAuth();

const onSubmit = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = '';
    
    await auth.registerUser(username.value, password.value);
    router.push('/');
  } catch (error) {
    errorMessage.value = 'Registration failed. Please try again.';
    console.error('Registration failed:', error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}
</style>