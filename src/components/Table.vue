<template>
  <div class="table-container" @click.self="deselectRow">
    <h2>Payments Table</h2>

    <!-- Action Buttons -->
    <div class="actions-right">
      <button @click="openModal('add')" title="Add Row">
        <img src="@/assets/add-icon.svg" alt="Add" class="icon" />
      </button>
      <button @click="openDeleteModal" :disabled="!selectedRow" title="Delete Row">
        <img src="@/assets/delete-icon.svg" alt="Delete" class="icon" />
      </button>
      <button @click="openModal('edit')" :disabled="!selectedRow" title="Edit Row">
        <img src="@/assets/edit-icon.svg" alt="Edit" class="icon" />
      </button>
    </div>

    <!-- Table -->
    <table border="0" cellspacing="0" cellpadding="5" @click.stop>
      <thead>
        <tr>
          <th v-for="header in headers" :key="header" @click="sortBy(header)" class="sortable">
            {{ header }}
            <span v-if="sortKey === header">{{ sortOrders[header] > 0 ? '▲' : '▼' }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, index) in sortedRows"
          :key="row.id"
          :class="{ selected: index === selectedIndex }"
          @click="selectRow(index)"
        >
          <td>{{ row.Name }}</td>
          <td>{{ row.Amount }}</td>
          <td>{{ row.PaymentType }}</td>
          <td>{{ formatDate(row.Date) }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h3>{{ modalType === 'add' ? 'Add New Entry' : 'Edit Entry' }}</h3>
        <form @submit.prevent="modalType === 'add' ? addRow() : updateRow()">
          <input v-model="tempRow.Name" type="text" placeholder="Name" required />
          <input
            v-model.number="tempRow.Amount"
            type="number"
            min="1"
            placeholder="Amount"
            required
          />
          <select v-model="tempRow.PaymentType" required>
            <option disabled value="">Select Payment Type</option>
            <option v-for="type in paymentTypes" :key="type" :value="type">{{ type }}</option>
          </select>
          <input v-model="tempRow.Date" type="date" placeholder="Date" required />

          <div class="modal-actions">
            <button type="submit">{{ modalType === 'add' ? 'Add' : 'Update' }}</button>
            <button type="button" @click="closeModal">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <div v-if="showDeleteModal" class="modal-overlay" @click.self="cancelDelete">
    <div class="modal">
      <h3>Delete Row</h3>
      <p>
        Are you sure you want to delete "<strong>{{ selectedRow.Name }}</strong
        >"?
      </p>
      <div class="modal-actions">
        <button @click="confirmDelete">Yes, Delete</button>
        <button @click="cancelDelete">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

const apiUrl = import.meta.env.VITE_API_URL

export default {
  name: 'Table',
  data() {
    return {
      headers: ['Name', 'Amount', 'Payment Type', 'Date'],
      paymentTypes: ['Electric', 'Water', 'Miscellaneous'],
      rows: [],
      selectedIndex: null,
      showModal: false,
      modalType: 'add',
      tempRow: { Name: '', Amount: null, PaymentType: '', Date: '' },
      sortKey: null,
      sortOrders: {},
      showDeleteModal: false,
    }
  },
  computed: {
    selectedRow() {
      return this.selectedIndex !== null ? this.rows[this.selectedIndex] : null
    },
    sortedRows() {
      if (!this.sortKey) return this.rows

      const keyMap = {
        Name: 'Name',
        Amount: 'Amount',
        'Payment Type': 'PaymentType',
        Date: 'Date',
      }
      const key = keyMap[this.sortKey]

      return [...this.rows].sort((a, b) => {
        const order = this.sortOrders[this.sortKey]
        const aVal = a[key]
        const bVal = b[key]

        if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * order
        if (key === 'Date') return (new Date(aVal) - new Date(bVal)) * order

        return aVal.toString().localeCompare(bVal.toString()) * order
      })
    },
  },
  created() {
    this.headers.forEach((header) => (this.sortOrders[header] = 1))
    this.fetchRows()

    // Optional: Poll backend every 5 seconds for "real-time" updates
    this.polling = setInterval(this.fetchRows, 5000)
  },
  beforeUnmount() {
    clearInterval(this.polling)
  },
  methods: {
    async fetchRows() {
      try {
        const res = await axios.get(`${apiUrl}/payments`)
        this.rows = res.data
      } catch (err) {
        console.error('Failed to fetch rows:', err)
      }
    },
    selectRow(index) {
      this.selectedIndex = this.selectedIndex === index ? null : index
    },
    deselectRow() {
      this.selectedIndex = null
    },
    openModal(type) {
      this.modalType = type
      if (type === 'edit' && this.selectedRow) {
        this.tempRow = { ...this.selectedRow }
      } else {
        this.tempRow = { Name: '', Amount: null, PaymentType: '', Date: '' }
      }
      this.showModal = true
    },
    closeModal() {
      this.showModal = false
    },
    async addRow() {
      if (this.tempRow.Amount <= 0) {
        alert('Amount must be positive!')
        return
      }
      try {
        const res = await axios.post(`${apiUrl}/payments`, this.tempRow)
        this.rows.push(res.data)
        this.closeModal()
      } catch (err) {
        console.error('Failed to add row:', err)
      }
    },
    async updateRow() {
      if (!this.selectedRow) return
      if (this.tempRow.Amount <= 0) {
        alert('Amount must be positive!')
        return
      }
      try {
        const res = await axios.put(`${apiUrl}/payments/${this.selectedRow.id}`, this.tempRow)
        this.rows.splice(this.selectedIndex, 1, res.data)
        this.closeModal()
      } catch (err) {
        console.error('Failed to update row:', err)
      }
    },
    openDeleteModal() {
      if (!this.selectedRow) return
      this.showDeleteModal = true
    },

    confirmDelete() {
      if (!this.selectedRow) return

      axios
        .delete(`${apiUrl}/payments/${this.selectedRow.id}`)
        .then(() => {
          this.rows.splice(this.selectedIndex, 1)
          this.selectedIndex = null
          this.showDeleteModal = false
        })
        .catch((err) => {
          console.error('Failed to delete row:', err)
          this.showDeleteModal = false
        })
    },

    cancelDelete() {
      this.showDeleteModal = false
    },
    sortBy(header) {
      this.sortKey === header ? (this.sortOrders[header] *= -1) : (this.sortKey = header)
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    },
  },
}
</script>

<style scoped>
.table-container {
  font-family: Arial, sans-serif;
  margin: 20px;
}

/* Right-side icon buttons */
.actions-right {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-bottom: 10px;
}

.actions-right button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
  transition:
    transform 0.2s,
    filter 0.2s;
}

.actions-right button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.actions-right button:hover:not(:disabled) {
  transform: scale(1.2);
  filter: brightness(1.2);
}

.actions-right .icon {
  width: 24px;
  height: 24px;
}

/* Table Styling */
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

thead {
  background-color: #3498db;
  color: white;
}

th,
td {
  padding: 12px 15px;
  border-bottom: 1px solid #ddd;
  text-align: left;
}

th.sortable {
  cursor: pointer;
  user-select: none;
}

tbody tr:hover {
  background-color: #ecf5fb;
}

tr.selected {
  background-color: #d0e7ff;
  font-weight: bold;
}

/* Modal Styling */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal {
  background: white;
  padding: 20px;
  border-radius: 8px;
  min-width: 300px;
}

.modal input,
.modal select {
  display: block;
  margin-bottom: 10px;
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.modal-actions button {
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  background-color: #3498db;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.modal-actions button:hover {
  background-color: #2980b9;
}
</style>
