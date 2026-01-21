<template>
  <div class="app-container">
    <!-- Sidebar -->
    <aside :class="['sidebar', { collapsed: isCollapsed }]">
      <h2 class="sidebar-title">Menu</h2>
      <button class="toggle-btn" @click="isCollapsed = !isCollapsed">☰</button>
      <ul class="menu">
        <li
          v-for="(option, index) in options"
          :key="index"
          @click="selectOption(option)"
          :class="{ active: option === selected }"
        >
          {{ option }}
        </li>
      </ul>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <component :is="currentComponent" />
    </main>
  </div>
</template>

<script>
// Import the components
import Table from './Table.vue'
import Dashboard from './Dashboard.vue'

export default {
  name: 'SidebarMenu',
  components: {
    Table,
    Dashboard,
  },
  data() {
    return {
      options: ['Dashboard', 'Table', 'Settings', 'Messages', 'Logout'],
      selected: 'Dashboard', // default selection
      isCollapsed: false,
    }
  },
  computed: {
    currentComponent() {
      switch (this.selected) {
        case 'Dashboard':
          return 'Dashboard'
        case 'Table':
          return 'Table'
        default:
          // Placeholder for other options
          return {
            template: `<div><h2>${this.selected}</h2><p>Content for ${this.selected} goes here.</p></div>`,
          }
      }
    },
  },
  methods: {
    selectOption(option) {
      this.selected = option
    },
  },
}
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  font-family: Arial, sans-serif;
}

/* Sidebar */
.sidebar {
  width: 200px;
  background-color: #3498db;
  color: white;
  padding: 20px;
}

.sidebar-title {
  margin-bottom: 20px;
  text-align: center;
}

.menu {
  list-style: none;
  padding: 0;
}

.menu li {
  padding: 10px;
  cursor: pointer;
  border-radius: 5px;
  margin-bottom: 5px;
  transition: background-color 0.2s;
}

.menu li:hover {
  background-color: #2980b9;
}

.menu li.active {
  background-color: #1f618d;
}

/* Main Content */
.main-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}
</style>
