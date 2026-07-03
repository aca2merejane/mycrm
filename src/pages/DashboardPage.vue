<template>
  <q-page padding class="bg-grey-1">
    <div class="row q-col-gutter-lg">
      <!-- KPI Cards -->
      <div class="col-12">
        <div class="row q-col-gutter-md">
          <div v-for="(card, index) in kpiCards" :key="index" class="col-12 col-sm-6 col-md-3">
            <q-card class="kpi-card shadow-1">
              <q-inner-loading :showing="loading" color="primary" />
              <q-card-section class="q-pb-none">
                <div class="row no-wrap items-center">
                  <div class="col text-grey-7 text-subtitle2 text-uppercase">{{ card.title }}</div>
                  <div class="col-auto">
                    <q-icon :name="card.icon" :color="card.color" size="lg" />
                  </div>
                </div>
              </q-card-section>

              <q-card-section class="q-pt-xs">
                <div v-if="loading" class="q-my-xs">
                   <q-skeleton type="text" width="60%" height="32px" />
                </div>
                <div v-else class="text-h5 text-weight-bold">{{ card.value }}</div>
                <div class="row items-center q-mt-xs">
                  <q-skeleton v-if="loading" type="text" width="40%" />
                  <template v-else>
                    <q-icon :name="card.trend >= 0 ? 'trending_up' : 'trending_down'" 
                      :color="card.trend >= 0 ? 'positive' : 'negative'" size="xs" />
                    <span :class="`text-caption q-ml-xs ${card.trend >= 0 ? 'text-positive' : 'text-negative'}`">
                      {{ Math.abs(card.trend) }}% {{ card.trendText || 'vs last month' }}
                    </span>
                  </template>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>

      <!-- Main Statistics -->
      <div class="col-12 col-md-8">
        <q-card class="shadow-1 full-height">
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6 text-weight-bold">Donations Growth Trend</div>
            <q-space />
            <q-btn-toggle
              v-model="period"
              flat stretch
              toggle-color="bmh-tosca"
              :options="[
                {label: 'Daily', value: 'daily'},
                {label: 'Monthly', value: 'monthly'}
              ]"
            />
          </q-card-section>
          <q-card-section>
            <div v-if="loading" class="flex flex-center" style="height: 350px">
              <q-spinner-dots color="bmh-tosca" size="40px" />
            </div>
            <apexchart v-else height="350" type="area" :options="trendChartOptions" :series="trendChartSeries" />
          </q-card-section>
        </q-card>
      </div>

      <!-- Product Mix -->
      <div class="col-12 col-md-4">
        <q-card class="shadow-1 full-height">
          <q-card-section>
            <div class="text-h6 text-weight-bold">Distribution by Fund Type</div>
          </q-card-section>
          <q-card-section class="flex flex-center">
            <div v-if="loading" class="flex flex-center" style="height: 250px; width: 100%">
              <q-spinner-pie color="primary" size="60px" />
            </div>
            <apexchart v-else width="100%" type="donut" :options="donutChartOptions" :series="donutChartSeries" />
          </q-card-section>
          <q-card-section class="q-pt-none">
            <q-list dense>
              <q-item v-for="(item, i) in productDistribution" :key="i">
                <q-item-section avatar>
                  <q-icon name="circle" :style="`color: ${donutChartOptions.colors[i % donutChartOptions.colors.length]}`" size="xs" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ item.label }}</q-item-label>
                  <q-item-label caption>{{ formatBillions(item.value) }} M</q-item-label>
                </q-item-section>
                <q-item-section side class="text-weight-bold text-primary">{{ item.percent }}%</q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <!-- Recent Transactions -->
      <div class="col-12">
        <q-card class="shadow-1">
          <q-card-section class="row items-center">
            <div class="text-h6 text-weight-bold">Recent Transactions</div>
            <q-space />
            <q-btn flat color="bmh-tosca" label="View All" to="/transactions" />
          </q-card-section>
          <q-table
            flat
            :rows="recentTransactions"
            :columns="tableColumns"
            row-key="id"
            :loading="loading"
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-chip
                  :color="props.value === 'PAID' ? 'positive' : 'warning'"
                  text-color="white"
                  dense
                  size="sm"
                >
                  {{ props.value }}
                </q-chip>
              </q-td>
            </template>
            <template v-slot:body-cell-total="props">
              <q-td :props="props">
                <div class="text-weight-bold">Rp {{ props.value.toLocaleString() }}</div>
              </q-td>
            </template>
          </q-table>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import { api } from '../api'

const apexchart = VueApexCharts
const loading = ref(true)
const period = ref('monthly')

const formatBillions = (val) => {
  if (!val) return '0'
  const inBillions = Number(val) / 1000000000
  return inBillions.toLocaleString('id-ID', { maximumFractionDigits: 2 })
}

// KPI Data
const kpiCards = ref([
  { title: 'YTD Collection', value: 'Rp 0', icon: 'payments', color: 'bmh-tosca', trend: 0 },
  { title: 'Total Donors', value: '0', icon: 'people', color: 'bmh-orange', trend: 0 },
  { title: 'Monthly Target', value: 'Rp 0 / 500M', icon: 'ads_click', color: 'primary', trend: 0 },
  { title: 'Retention Rate', value: '78%', icon: 'loop', color: 'secondary', trend: 3.4 }
])

// Trend Chart
const trendChartSeries = ref([
  { name: 'Donations ' + new Date().getFullYear(), data: Array(12).fill(0) },
  { name: 'Donations ' + (new Date().getFullYear() - 1), data: Array(12).fill(0) }
])

const trendChartOptions = ref({
  chart: { toolbar: { show: false } },
  colors: ['#14B8A6', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1', '#10B981', '#F43F5E', '#84CC16'],
  stroke: { curve: 'smooth', width: 3 },
  xaxis: { categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] },
  tooltip: {
    y: { formatter: (val) => `Rp ${val.toLocaleString()}` }
  }
})

// Donut Chart
const donutChartSeries = ref([])
const donutChartOptions = ref({
  labels: [],
  colors: ['#14B8A6', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#6366F1', '#10B981', '#F43F5E', '#84CC16'],
  legend: { show: false },
  plotOptions: {
    pie: {
      donut: {
        size: '65%',
        labels: {
          show: true,
          total: { 
            show: true, 
            label: 'Total (M)', 
            formatter: (w) => {
              const total = w.globals.seriesTotals.reduce((a, b) => a + b, 0)
              return formatBillions(total)
            }
          },
          value: {
            formatter: (val) => formatBillions(val) + ' M'
          }
        }
      }
    }
  },
  tooltip: {
    y: {
      formatter: (val) => `${formatBillions(val)} Milyar`
    }
  }
})

const productDistribution = ref([])

// Recent Transactions Data
const tableColumns = [
  { name: 'date', label: 'Date', field: 'date', align: 'left', sortable: true },
  { name: 'donor_name', label: 'Donor', field: 'donor_name', align: 'left', sortable: true },
  { name: 'total', label: 'Total', field: 'total', align: 'right', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'center' }
]

const recentTransactions = ref([])

const fetchStats = async () => {
  // Load from local cache first for instant UI
  const localCache = localStorage.getItem('dashboard_stats_' + (api.defaults.headers.common['Authorization'] || 'guest'))
  if (localCache) {
    try {
      const parsed = JSON.parse(localCache)
      updateUI(parsed)
      loading.value = false // Data from cache is ready, show charts
    } catch (e) {}
  }

  // Always fetch fresh data in background
  try {
    const response = await api.get('/stats')
    const data = response.data
    
    // Save to local cache
    localStorage.setItem('dashboard_stats_' + (api.defaults.headers.common['Authorization'] || 'guest'), JSON.stringify(data))
    
    updateUI(data)
  } catch (error) {
    console.error('Failed to fetch stats:', error)
  } finally {
    loading.value = false
  }
}

const updateUI = (data) => {
  const { kpis, trend, distribution, recentTransactions: txs } = data
  
  // YTD Trend: Cur vs Last Year (same periods)
  const ytdCur = kpis.ytdCollection
  const ytdLast = kpis.ytdLastCollection
  const ytdTrend = ytdLast > 0 ? Math.round(((ytdCur - ytdLast) / ytdLast) * 100) : 0
  
  kpiCards.value[0].value = `Rp ${ytdCur.toLocaleString()}`
  kpiCards.value[0].trend = ytdTrend
  kpiCards.value[0].trendText = 'vs same period'
  
  // Donor Trend: Cur vs Last Year
  const curDonors = kpis.donors
  const lDonors = kpis.lastYearDonors
  const dTrend = lDonors > 0 ? Math.round(((curDonors - lDonors) / lDonors) * 100) : 0
  kpiCards.value[1].value = curDonors.toLocaleString()
  kpiCards.value[1].trend = dTrend
  kpiCards.value[1].trendText = 'vs last year'

  kpiCards.value[2].value = `Rp ${kpis.monthly.toLocaleString()} / 500M`
  
  trendChartSeries.value[0].data = trend.current
  trendChartSeries.value[1].data = trend.last

  // Update Series
  donutChartSeries.value = distribution.map(d => Number(d.value))
  
  donutChartOptions.value = {
    ...donutChartOptions.value,
    labels: distribution.map(d => d.label || 'Lainnya')
  }
  
  const totalDist = distribution.reduce((acc, curr) => acc + Number(curr.value), 0)
  productDistribution.value = distribution.map(d => ({
    label: d.label || 'Lainnya',
    value: Number(d.value),
    percent: totalDist > 0 ? Math.round((Number(d.value) / totalDist) * 100) : 0
  }))

  recentTransactions.value = txs
}

onMounted(fetchStats)
</script>

<style lang="scss" scoped>
.kpi-card {
  transition: transform 0.3s ease;
  border-radius: 12px;
  &:hover {
    transform: translateY(-4px);
  }
}
</style>
