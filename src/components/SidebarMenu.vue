<template>
  <div class="app-container">
    <!-- Sidebar -->
    <button v-if="!isOpen" class="burger" @click="toggleSidebar">☰</button>

    <!-- Overlay (only visible when sidebar is open) -->
    <div v-if="isOpen" class="overlay" @click="isOpen = false"></div>

    <aside class="sidebar" :class="{ open: isOpen }">
      <h2 class="sidebar-title">Menu</h2>
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
      isOpen: false,
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
      this.isOpen = false // auto-close on mobile
    },
    toggleSidebar() {
      this.isOpen = !this.isOpen
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

.burger {
  display: none;
  position: fixed;
  top: 15px;
  left: 15px;
  font-size: 24px;
  background: none;
  border: none;
  color: #3498db;
  z-index: 1001;
  cursor: pointer;
}

/* Mobile behavior */
@media (max-width: 768px) {
  .burger {
    display: block;
  }

  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    z-index: 999; /* behind sidebar but above content */
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: -220px;
    height: 100vh;
    transition: left 0.3s ease;
    z-index: 1000;
  }

  .sidebar.open {
    left: 0;
  }

  .main-content {
    padding-top: 60px;
  }
}
</style>
