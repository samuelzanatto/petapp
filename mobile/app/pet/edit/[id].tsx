import React from 'react';
import { Stack } from 'expo-router';
import CreateEditPet from '../create';

export default function EditPet() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <CreateEditPet />
    </>
  );
}