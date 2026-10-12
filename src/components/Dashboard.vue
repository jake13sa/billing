<template>
  <div class="dashboard-container">
    <h2>Dashboard</h2>

    <div class="summary-boxes">
      <div class="box electric">
        <h3>Electric</h3>
        <p>{{ formatCurrency(totals.Electric) }}</p>
      </div>
      <div class="box water">
        <h3>Water</h3>
        <p>{{ formatCurrency(totals.Water) }}</p>
      </div>
      <div class="box misc">
        <h3>Miscellaneous</h3>
        <p>{{ formatCurrency(totals.Miscellaneous) }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '../api'

export default {
  name: 'PaymentDashboard',
  data() {
    return {
      rows: [],
      totals: {
        Electric: 0,
        Water: 0,
        Miscellaneous: 0,
      },
    }
  },
  created() {
    this.fetchRows()
    // Optional: poll every 2 seconds to stay updated
    this.polling = setInterval(this.fetchRows, 2000)
  },
  beforeUnmount() {
    clearInterval(this.polling)
  },
  methods: {
    async fetchRows() {
      try {
        const res = await api.get('/payments')
        this.rows = res.data
        this.calculateTotals()
      } catch (err) {
        console.error('Failed to fetch payments:', err)
      }
    },
    calculateTotals() {
      // Reset totals
      this.totals = { Electric: 0, Water: 0, Miscellaneous: 0 }

      this.rows.forEach((row) => {
        if (row.PaymentType === 'Electric') this.totals.Electric += row.Amount
        else if (row.PaymentType === 'Water') this.totals.Water += row.Amount
        else if (row.PaymentType === 'Miscellaneous') this.totals.Miscellaneous += row.Amount
      })
    },
    formatCurrency(value) {
      return '₱' + Number(value || 0).toLocaleString()
    },
  },
}
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.summary-boxes {
  display: flex;
  gap: 20px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.box {
  flex: 1;
  min-width: 150px;
  padding: 20px;
  border-radius: 10px;
  color: white;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.box:hover {
  transform: translateY(-5px);
}

.box h3 {
  margin-bottom: 10px;
}

.electric {
  background-color: #f39c12; /* Orange */
}

.water {
  background-color: #3498db; /* Blue */
}

.misc {
  background-color: #2ecc71; /* Green */
}
</style>
