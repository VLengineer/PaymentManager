import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Project, Contractor, BudgetCategory } from '@/types';
import { dictionaryApi } from '@/api';

export const useDictionaryStore = defineStore('dictionary', () => {
  const projects = ref<Project[]>([]);
  const contractors = ref<Contractor[]>([]);
  const categories = ref<BudgetCategory[]>([]);
  const loading = ref(false);

  async function loadProjects() {
    loading.value = true;
    try {
      projects.value = await dictionaryApi.getProjects();
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      loading.value = false;
    }
  }

  async function loadContractors() {
    loading.value = true;
    try {
      contractors.value = await dictionaryApi.getContractors();
    } catch (error) {
      console.error('Failed to load contractors:', error);
    } finally {
      loading.value = false;
    }
  }

  async function loadCategories() {
    loading.value = true;
    try {
      categories.value = await dictionaryApi.getCategories();
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      loading.value = false;
    }
  }

  async function loadAll() {
    await Promise.all([loadProjects(), loadContractors(), loadCategories()]);
  }

  return {
    projects,
    contractors,
    categories,
    loading,
    loadProjects,
    loadContractors,
    loadCategories,
    loadAll,
  };
});
