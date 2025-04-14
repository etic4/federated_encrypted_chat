<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { useAuth } from '~/composables/useAuth'

const errorMessage = ref('');
const isLoading = ref(false);
const router = useRouter();
const auth = useAuth();

const onSubmit = async (values) => {
  try {
    isLoading.value = true;
    errorMessage.value = '';
    
    await auth.registerUser(values.username, values.password);
    router.push('/');
  } catch (error) {
    errorMessage.value = 'Registration failed. Please try again.';
    console.error('Registration failed:', error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="container">
    <Card>
      <CardHeader>
        <CardTitle>Register</CardTitle>
        <CardDescription>Create an account to start using our service.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form :initial-values="{ username: '', password: '' }" @submit="onSubmit" v-slot="{ errors }">
          <div class="grid gap-4">
            <FormField name="username" v-slot="{ field }">
              <FormItem>
                <FormLabel for="username">Username</FormLabel>
                <FormControl>
                  <Input id="username" placeholder="Enter your username" v-bind="field" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
            <FormField name="password" v-slot="{ field }">
              <FormItem>
                <FormLabel for="password">Password</FormLabel>
                <FormControl>
                  <Input id="password" type="password" placeholder="Enter your password" v-bind="field" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
            <Button type="submit" :disabled="isLoading">
              {{ isLoading ? 'Registering...' : 'Register' }}
            </Button>
          </div>
        </Form>
        <div v-if="errorMessage" class="text-red-500 mt-4">{{ errorMessage }}</div>
      </CardContent>
    </Card>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}
</style>